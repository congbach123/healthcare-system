# healthcare_microservices/Dockerfile

# Use an official Python runtime as a parent image
FROM python:3.11-bookworm

# Install system dependencies required for mysqlclient and building Python packages
RUN apt-get update \
    && apt-get install -y --no-install-recommends default-libmysqlclient-dev gcc pkg-config python3-dev \
    && rm -rf /var/lib/apt/lists/* # Clean up apt cache to reduce image size


# Set the working directory in the container
WORKDIR /app

# Copy the current directory contents into the container at /app
COPY . /app/

# Expose the port the app runs on
EXPOSE 8000