FROM python:3.11-slim
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
COPY pyproject.toml README.md ./
COPY beacon ./beacon
RUN pip install --no-cache-dir .
COPY web ./web
COPY config.yaml run.py ./
RUN mkdir -p /app/data
EXPOSE 8888
CMD ["python", "run.py", "serve", "--host", "0.0.0.0", "--port", "8888"]
