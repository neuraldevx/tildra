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
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY api/main.py .
# Add other necessary python files if any
# e.g. COPY api/utils.py .

# Expose the port the app runs on
EXPOSE 8000

# Define the command to run your app using uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"] 