# Use an official Python runtime as a parent image
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# --- Start Edit: Install Node.js and pnpm --- 
# Install curl and gnupg for NodeSource setup
RUN apt-get update && apt-get install -y --no-install-recommends curl gnupg \
    && rm -rf /var/lib/apt/lists/*

# Add NodeSource repository for Node.js 18.x and install Node.js
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get update && apt-get install -y nodejs

# Install pnpm globally using npm
RUN npm install -g pnpm
# --- End Edit ---

# Set the working directory in the container
WORKDIR /app

# Install system dependencies if needed (uncomment if you add packages requiring them)
# RUN apt-get update && apt-get install -y --no-install-recommends gcc && rm -rf /var/lib/apt/lists/*

# Install pip dependencies
# Copy only requirements first to leverage Docker cache
# The source path is relative to the build context root (snipsummary/)
COPY api/requirements.txt requirements.txt
RUN pip install --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt

# --- Start Edit: Install Node deps and generate Prisma Client --- 
# Copy Node.js package files and schema
COPY api/package.json api/pnpm-lock.yaml ./
COPY api/prisma ./prisma/

# Install Node.js dependencies (including prisma CLI)
# Using --frozen-lockfile is recommended for reproducible builds
RUN pnpm install --frozen-lockfile

# Generate the Prisma Python client
# Ensure schema is copied before this step
RUN pnpm dlx prisma generate --schema ./prisma/schema.prisma
# --- End Edit ---

# Copy the rest of the application code
# This needs to happen AFTER generate, in case generate modifies files outside prisma/
# It copies over the already copied files, which is fine.
COPY api/ . 

# Expose the port the app runs on
EXPOSE 8000

# Define the command to run your app using uvicorn
# Use 0.0.0.0 to allow external connections to the container
# Fly.io will set the PORT environment variable, but we default to 8000 if not set.
# Using Gunicorn with Uvicorn workers is common for production, but direct uvicorn is simpler for now.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"] 