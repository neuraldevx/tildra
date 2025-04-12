# Use an official Python runtime as a parent image
FROM python:3.11-slim

# Install Node.js and pnpm dependencies
RUN apt-get update && apt-get install -y --no-install-recommends curl gnupg \
    && rm -rf /var/lib/apt/lists/*
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get update && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*
RUN npm install -g pnpm

# Set the working directory in the container
WORKDIR /app

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Copy ALL application code first (including requirements, package.json, prisma schema, main.py etc.)
COPY api/ . /app/

# Install Python dependencies
RUN pip install --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt

# Install Node.js dependencies (using manifests already copied into /app)
RUN pnpm install --frozen-lockfile

# Generate Prisma Client (after all source code and dependencies are in place)
RUN pnpm dlx prisma generate --schema ./prisma/schema.prisma

# Expose the port the app runs on
EXPOSE 8000

# Define the command to run your app using uvicorn
# Use 0.0.0.0 to allow external connections to the container
# Fly.io will set the PORT environment variable, but we default to 8000 if not set.
# Using Gunicorn with Uvicorn workers is common for production, but direct uvicorn is simpler for now.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"] 