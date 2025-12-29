# mainframe-connector/Dockerfile
FROM python:3.11-slim

RUN apt update && apt install -y telnet python3-pip git && \
    pip install py3270

WORKDIR /app

COPY connect.py /app/
COPY submit_jcl.py /app/

CMD ["python3", "connect.py"]
