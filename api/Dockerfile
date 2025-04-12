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

# --- Optional: Add a command to list generated files for debugging during build ---
# RUN ls -l /usr/local/lib/python3.11/site-packages/prisma # Adjust path if necessary
# RUN ls -l /usr/local/lib/python3.11/site-packages/prisma/client # Adjust path if necessary
# Note: The path to site-packages might differ in the node image vs python image.
# We are primarily interested in the *existence* of generated files here,
# and the copy step below assumes they are generated *within* the pnpm structure.
# A common location after generation is within node_modules/prisma/client/...
# Let's list the default prisma client location for inspection during build:
RUN echo "Listing generated Prisma Client files within node_modules:" && ls -R ./node_modules/prisma/client || echo "Prisma client not found in node_modules"
RUN echo "Listing generated Prisma Client files directly within prisma directory (less likely):" && ls -R ./prisma/client || echo "Prisma client not found directly in prisma dir"


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
# The location within the 'builder' stage's node_modules is standard for prisma generate
# The target location needs to be the Python site-packages directory
# We need to find the exact site-packages path for python3.11-slim
# Let's determine it dynamically during the build
RUN python -c "import sysconfig; print(sysconfig.get_paths()['purelib'])"
# The above command will print the path, e.g., /usr/local/lib/python3.11/site-packages
# We need to capture this path. Let's assume it's the standard path for now:
ARG SITE_PACKAGES=/usr/local/lib/python3.11/site-packages
COPY --from=builder /build/node_modules/prisma/client ${SITE_PACKAGES}/prisma/client
# Also copy the base prisma package files potentially needed
COPY --from=builder /build/node_modules/prisma/__init__.py ${SITE_PACKAGES}/prisma/__init__.py
COPY --from=builder /build/node_modules/prisma/errors.py ${SITE_PACKAGES}/prisma/errors.py
COPY --from=builder /build/node_modules/prisma/utils.py ${SITE_PACKAGES}/prisma/utils.py
# Add any other essential base files if import errors occur later


# Expose the port the app runs on
EXPOSE 8000

# Define the command to run your app using uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"] 