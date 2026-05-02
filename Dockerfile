FROM node:22-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install ALL dependencies (node_modules needed at runtime: esbuild uses --packages=external)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build server bundle
RUN pnpm build

# Expose port
EXPOSE 3000

# Start server (node_modules remain in /app for runtime imports)
CMD ["node", "dist/index.js"]
