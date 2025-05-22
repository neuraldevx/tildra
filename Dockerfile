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

# Create a non-root user and group EARLY
RUN groupadd --gid 1000 appuser && \
    useradd --uid 1000 --gid 1000 -m appuser

# Set working directory and change ownership
WORKDIR /app
RUN chown appuser:appuser /app

# Switch to the non-root user BEFORE installing packages
USER appuser

# --- Install Python dependencies as appuser ---
# Copy requirements first to leverage Docker cache
COPY --chown=appuser:appuser api/requirements.txt ./
RUN pip install --user --no-cache-dir --upgrade pip && \
    pip install --user --no-cache-dir -r requirements.txt

# --- Copy Prisma Schema and application code ---
COPY --chown=appuser:appuser prisma/schema.prisma ./prisma/
COPY --chown=appuser:appuser api/ ./

# --- Generate Prisma Client as appuser ---
# Use Python Prisma CLI, and ensure user packages are in PATH
ENV PATH="/home/appuser/.local/bin:$PATH"
RUN python3 -m prisma generate --schema=./prisma/schema.prisma

# Expose the port the app runs on (matches fly.toml internal_port)
EXPOSE 8080

# Define the command to run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]

# Optional: Use Gunicorn
# CMD ["gunicorn", "main:app", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8080"] 