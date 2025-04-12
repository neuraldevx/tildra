# Use an official Python runtime as a parent image
FROM python:3.11-slim

# Install Node.js and pnpm within the Python image
RUN apt-get update && apt-get install -y --no-install-recommends curl gnupg \
    && rm -rf /var/lib/apt/lists/*
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get update && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*
RUN npm install -g pnpm

WORKDIR /app

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Copy manifests and schema first for better caching
COPY api/requirements.txt requirements.txt
COPY api/package.json package.json
COPY api/pnpm-lock.yaml pnpm-lock.yaml
COPY api/prisma ./prisma/

# Install Python dependencies (including prisma-client-py)
RUN pip install --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt

# Install Node.js dependencies (which installs the prisma CLI locally)
RUN pnpm install --frozen-lockfile

# Generate Prisma Client using the executable from the local node_modules
# Output location is defined in prisma/schema.prisma
RUN ./node_modules/.bin/prisma generate --schema ./prisma/schema.prisma

# Debug: List the generated client directory (relative to WORKDIR /app)
# Expected path based on schema output = "../generated/prisma"
RUN echo "Listing generated Prisma Client files within /app/generated/prisma/client:" && ls -R ./generated/prisma/client

# Copy the rest of the application code
COPY api/main.py .
# Add other necessary python files if any
# e.g. COPY api/utils.py .

# Expose the port the app runs on
EXPOSE 8000

# Define the command to run your app using uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"] 