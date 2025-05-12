# syntax=docker/dockerfile:1

# ---- Final Stage: Python Application ----
# Use an official Python runtime as a parent image
FROM python:3.11-slim-bookworm

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# --- Install Node.js, npm, and System Dependencies ---
# Update apt and install curl, gnupg (for nodesource), and nodejs
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl gnupg ca-certificates && \
    # Add NodeSource repository for Node.js 20.x
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    # Clean up apt cache
    rm -rf /var/lib/apt/lists/*

# --- Install Prisma CLI globally ---
RUN npm install -g prisma@5.17.0 --force

# Create a non-root user and group
RUN groupadd --gid 1000 appuser && \
    useradd --uid 1000 --gid 1000 -m appuser

# Set working directory in the container
WORKDIR /app

# --- Install Python dependencies ---
# Copy requirements first to leverage Docker cache
COPY api/requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# --- Copy Prisma Schema BEFORE generate ---
# Ensure the schema is available for generation
COPY prisma/schema.prisma ./prisma/

# --- Generate Prisma Client --- 
# Ensure Node's global bin is in PATH and specify schema location
ENV PATH=/usr/local/bin:${PATH}
RUN prisma generate --schema=./prisma/schema.prisma

# --- Copy application code ---
# Copy the rest of the application code from the 'api' directory
COPY api/ ./

# Change ownership to the non-root user
# Run chown AFTER all files are copied
RUN chown -R appuser:appuser /app

# Switch to the non-root user
USER appuser

# Expose the port the app runs on (matches fly.toml internal_port)
EXPOSE 8080

# Define the command to run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]

# Optional: Use Gunicorn
# CMD ["gunicorn", "main:app", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8080"] 