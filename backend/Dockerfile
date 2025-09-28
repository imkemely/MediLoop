FROM python:3.13-slim
WORKDIR /app

# Install deps
COPY backend/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy backend code (and keep package path 'backend.*')
COPY backend /app/backend

# Railway injects $PORT (typically 8080)
ENV PYTHONUNBUFFERED=1
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "${PORT}"]
