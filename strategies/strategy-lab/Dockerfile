FROM python:3.12-slim

RUN useradd --create-home trader
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY --chown=trader:trader . .
USER trader

# Database and logs live on a volume so halts and trade history survive container restarts.
VOLUME ["/app/data"]
ENV PYTHONUNBUFFERED=1

# Default: paper trading. Override the command for other tasks, e.g.
#   docker run --env-file .env -v $PWD/data:/app/data strategy-lab python -m app.main research
CMD ["python", "-m", "app.main", "lab"]
