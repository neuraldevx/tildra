# Use an official Python runtime as a parent image
FROM python:3.11-slim

WORKDIR /app

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Copy manifests and schema first for better caching
COPY api/requirements.txt requirements.txt

# Install Python dependencies
RUN pip install --upgrade pip

# --- Debug: Purge pip cache ---
RUN echo "Purging pip cache..." && pip cache purge

# Install from requirements file (remove verbosity here)
RUN pip install --no-cache --no-cache-dir -r requirements.txt

# Explicitly install clerk-backend-api with verbosity to isolate issues
# Quote the package name and version specifier to prevent shell redirection
RUN pip install --no-cache --no-cache-dir -vvv "clerk-backend-api>=2.0.0,<3.0.0"

# --- Debug: Verify installation directory ---
# Check if the clerk_backend_api directory exists in site-packages
RUN echo "Listing site-packages directory for clerk* packages:" \
    && ls -ld /usr/local/lib/python3.11/site-packages/clerk* \
    || echo "clerk_backend_api directory not found in site-packages"

# Copy the rest of the application code
COPY api/main.py .
# Add other necessary python files if any
# e.g. COPY api/utils.py .

# Expose the port the app runs on
EXPOSE 8000

# Define the command to run your app using uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"] 