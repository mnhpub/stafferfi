from py3270 import Emulator
import ssl

HOST = "tk4-emulator"  # docker network alias
PORT = 10443

# Connect using TLS-wrapped socket
context = ssl.create_default_context()
em = Emulator(visible=True, secure=True, ssl_context=context)
em.connect(f"{HOST}:{PORT}")

# Example: login and submit JCL
em.send_string("USERID")
em.send_enter()
em.send_string("PASSWORD")
em.send_enter()

# Submit JCL
with open("/app/hello.jcl") as f:
    jcl_lines = f.read().splitlines()
    for line in jcl_lines:
        em.send_string(line)
        em.send_enter()

# Capture SYSOUT (mock)
print("JCL submitted to emulator.")
em.terminate()
