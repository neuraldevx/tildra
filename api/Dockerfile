# Use the full official Python runtime as a parent image
FROM python:3.11

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

# --- Verify Stripe Installation --- 
RUN echo "Verifying stripe installation:" && pip freeze | grep stripe || (echo "ERROR: stripe not found after pip install!" && exit 1)
# ---------------------------------

# --- Debug: Verify installation directory (Keep if useful) ---
RUN echo "Listing site-packages directory for clerk* packages:" \
    && ls -ld /usr/local/lib/python3.11/site-packages/clerk* \
    || echo "clerk_backend_api directory not found in site-packages"

# --- Generate Prisma Client ---
RUN prisma generate
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