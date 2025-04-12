# Use the full official Python runtime as a parent image
FROM python:3.11

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

# --- Modified CMD for Runtime Diagnostics ---
# Run a shell script that performs checks before executing uvicorn
CMD ["sh", "-c", "\
    echo '--- Runtime Diagnostics Start ---'; \
    echo 'Python Version:'; python --version; \
    echo 'Python Path (sys.path):'; python -c 'import sys; import pprint; pprint.pprint(sys.path)'; \
    echo 'Installed Packages (pip freeze):'; pip freeze; \
    echo 'Attempting Clerk import...'; \
    python -c 'from clerk_backend_api.clerk import Clerk; print(\"SUCCESS: Clerk module imported successfully!\")' || echo 'FAILURE: Clerk module import failed!'; \
    echo '--- Runtime Diagnostics End ---'; \
    echo 'Starting Uvicorn...'; \
    exec uvicorn main:app --host 0.0.0.0 --port 8000 \
"] 