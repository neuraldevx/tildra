# Use an official Python runtime as a parent image
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

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

# Copy the rest of the application code from the api directory into the container's /app directory
# The source path is relative to the build context root (snipsummary/)
COPY api/ . 

# Expose the port the app runs on
EXPOSE 8000

# Define the command to run your app using uvicorn
# Use 0.0.0.0 to allow external connections to the container
# Fly.io will set the PORT environment variable, but we default to 8000 if not set.
# Using Gunicorn with Uvicorn workers is common for production, but direct uvicorn is simpler for now.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"] 