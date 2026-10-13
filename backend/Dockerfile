FROM python:3.14-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Production installs the runtime set; the root docker-compose.yml, which runs
# with DJANGO_DEBUG=true, asks for requirements-dev.txt, because DEBUG installs
# django-debug-toolbar (TD-24) and the dev stack would not start without it
# (TD-51).
ARG REQUIREMENTS=requirements.txt
COPY requirements.txt requirements-dev.txt ./
RUN pip install --no-cache-dir -r ${REQUIREMENTS}

COPY . .

EXPOSE 8000

CMD ["sh", "-c", "python manage.py migrate && python manage.py runserver 0.0.0.0:8000"]
