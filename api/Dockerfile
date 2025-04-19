# Use the full official Python runtime as a parent image
FROM python:3.11

# --- ADD Node.js Installation ---
# Install Node.js and npm (needed for npx and Prisma CLI)
# Using NodeSource setup script (common method)
RUN apt-get update && \
    apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs
# Verify installations
RUN node --version
RUN npm --version
# --- END Node.js Installation ---

WORKDIR /app

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Copy requirements first, relative to the build context root
COPY ./api/requirements.txt requirements.txt

# Copy Prisma schema directory (relative to build context root)
COPY ./prisma ./prisma

# Install Python dependencies
RUN pip install --upgrade pip

# Install from requirements file
RUN pip install --no-cache --no-cache-dir -r requirements.txt

# --- ADD Prisma CLI Installation ---
# Install the specific version of Prisma CLI needed by the Python client
# (Adjust version 5.17.0 if your Python client requires a different one)
RUN npm install prisma@5.17.0 --save-dev --omit=optional
# Verify Prisma CLI installation
RUN npx prisma --version
# --- END Prisma CLI Installation ---

# --- Verify Stripe Installation --- 
RUN echo "Verifying stripe installation:" && pip freeze | grep stripe || (echo "ERROR: stripe not found after pip install!" && exit 1)
# ---------------------------------

# --- Debug: Verify installation directory (Keep if useful) ---
RUN echo "Listing site-packages directory for clerk* packages:" \
    && ls -ld /usr/local/lib/python3.11/site-packages/clerk* \
    || echo "clerk_backend_api directory not found in site-packages"

# --- Generate Prisma Client ---
# Add node_modules/.bin to PATH and Generate the Prisma Python client code
ENV PATH="/app/node_modules/.bin:$PATH"
RUN echo "Updated PATH: $PATH" # Debugging PATH
RUN which npx # Debugging npx location
RUN which prisma # Debugging prisma location
RUN python3 -m prisma generate --schema=./prisma/schema.prisma
# --------------------------

# Copy the main application file (relative to build context root)
COPY ./api/main.py .

# Expose the port the app runs on
EXPOSE 8000

# --- CMD - Use the simplified one --- 
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

# --- Old CMD with Diagnostics (Keep for reference if needed) ---
# CMD ["sh", "-c", "\
#     echo '--- Runtime Diagnostics Start ---'; \
#     echo 'Python Version:'; python --version; \
#     echo 'Python Path (sys.path):'; python -c 'import sys; import pprint; pprint.pprint(sys.path)'; \
#     echo 'Installed Packages (pip freeze):'; pip freeze; \
#     echo 'Attempting Clerk import...'; \
#     python -c 'from clerk_backend_api.sdk import Clerk; print(\"SUCCESS: Clerk module imported successfully!\")' || echo 'FAILURE: Clerk module import failed!'; \
#     echo 'Attempting Prisma import...'; \
#     python -c 'from prisma import Prisma; print(\"SUCCESS: Prisma module imported successfully!\")' || echo 'FAILURE: Prisma module import failed!'; \
#     echo '--- Runtime Diagnostics End ---'; \
#     echo 'Starting Uvicorn...'; \
#     exec uvicorn main:app --host 0.0.0.0 --port 8000 \
# "] 