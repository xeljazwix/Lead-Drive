FROM node:20-bullseye-slim

# Install ClamAV for virus scanning
RUN apt-get update && \
    apt-get install -y clamav clamav-daemon && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Initialize ClamAV databases
RUN freshclam || true

# Start the ClamAV daemon in the background (we will start it in the entrypoint)
# Create a dedicated entrypoint script
RUN echo '#!/bin/bash\n\
service clamav-daemon start\n\
npm run start\n' > /entrypoint.sh && chmod +x /entrypoint.sh

WORKDIR /app

# Install dependencies first (for caching)
COPY package.json package-lock.json ./
RUN npm ci

# Copy Prisma schema and generate client
COPY prisma ./prisma
RUN npx prisma generate

# Copy the rest of the application
COPY . .

# Expose port
EXPOSE 3000

# Set environment to production
ENV NODE_ENV=production

# Run the entrypoint script
CMD ["/entrypoint.sh"]
