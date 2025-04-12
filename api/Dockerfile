# Stage 1: Build Node.js dependencies and generate Prisma client
FROM node:18-slim AS builder

# Install pnpm
RUN npm install -g pnpm

WORKDIR /build

# Copy only package files first for better caching
COPY api/package.json api/pnpm-lock.yaml ./

# Install Node.js dependencies (including prisma CLI)
RUN pnpm install --frozen-lockfile

# Copy Prisma schema
COPY api/prisma ./prisma/

# Generate Prisma Client
RUN pnpm dlx prisma generate --schema ./prisma/schema.prisma

# Debug: List the contents of the expected generated client directory
RUN echo "Listing generated Prisma Client files within /build/prisma/client:" && ls -R ./prisma/client || echo "Prisma client not found in /build/prisma/client"


# Stage 2: Final Python runtime image
FROM python:3.11-slim

WORKDIR /app

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install Python dependencies
COPY api/requirements.txt requirements.txt
RUN pip install --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code (excluding prisma schema, package files already handled)
COPY api/main.py .
# Copy any other necessary Python files from api/ here
# e.g. COPY api/utils.py .

# Copy the generated Prisma client from the builder stage
# Determine Python's site-packages directory
RUN python -c "import sysconfig; print(sysconfig.get_paths()['purelib'])" 
# Assume standard path for python:3.11-slim
ARG SITE_PACKAGES=/usr/local/lib/python3.11/site-packages

# Copy the generated client from the location relative to the schema in the builder stage
COPY --from=builder /build/prisma/client ${SITE_PACKAGES}/prisma/client

# Remove unnecessary copy commands for base files (should be installed by pip)
# COPY --from=builder /build/node_modules/prisma/__init__.py ${SITE_PACKAGES}/prisma/__init__.py
# COPY --from=builder /build/node_modules/prisma/errors.py ${SITE_PACKAGES}/prisma/errors.py
# COPY --from=builder /build/node_modules/prisma/utils.py ${SITE_PACKAGES}/prisma/utils.py


# Expose the port the app runs on
EXPOSE 8000

# Define the command to run your app using uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"] 