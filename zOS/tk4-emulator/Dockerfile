# tk4-emulator/Dockerfile
FROM ubuntu:22.04

# Install dependencies
RUN apt-get update && apt-get install -y \
    hercules \
    stunnel4 \
    wget \
    unzip \
    vim \
    bash \
    net-tools \
    telnet \
    && rm -rf /var/lib/apt/lists/*

# Create directories
RUN mkdir -p /mvs /mvs/spool /mvs/tn3270

WORKDIR /mvs

# Download TK4- MVS 3.8J public domain system
RUN wget https://sourceforge.net/projects/tk4-3-8j/files/tk4-.zip -O /tmp/tk4.zip \
    && unzip /tmp/tk4.zip -d /mvs \
    && rm /tmp/tk4.zip

# Copy Hercules config & startup script
COPY hercules.cnf /mvs/
COPY startup.sh /mvs/
COPY stunnel.conf /mvs/

# Expose TN3270 TLS port
EXPOSE 10443

# Start Hercules and stunnel
CMD ["bash", "/mvs/startup.sh"]
