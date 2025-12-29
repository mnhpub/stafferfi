+----------------+         +----------------+         +----------------+
|  TK4 Emulator  | <-----> | Connector     | <-----> | CI/CD Pipeline |
| (MVS 3.8J)    | TN3270   | Docker Image  |         | GitHub Actions|
+----------------+  TLS    +----------------+         +----------------+
        |                                               |
        v                                               v
  Hello World C/JCL Output                       GitOps Repository
        |                                               |
        v                                               v
  Logs / Snapshots / Diff                      Dashboard / API Layer
