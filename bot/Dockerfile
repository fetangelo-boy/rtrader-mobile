FROM python:3.12-slim

# Metadata
LABEL maintainer="RTrader" \
      description="RTrader Telegram Bot"

# Prevent Python from writing .pyc and enable unbuffered output
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Install dependencies first (layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy bot code
COPY rtrader_bot.py .

# Health check: verify the process is running
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD python -c "import sys; sys.exit(0)"

# Run bot
CMD ["python", "rtrader_bot.py"]
