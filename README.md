> npx drizzle-kit push
> In 2026, you have two primary ways to sync your model to the database:
> Method Command Best Use Case
> Drizzle Push npx drizzle-kit push Local Development: Directly pushes schema changes to the DB without creating migration files.
> Migrations npx drizzle-kit generate Production/Teams: Generates version-controlled .sql files that you can review and apply.

I've built the TR-069 CPE Client simulator. It includes a fully functional backend simulating a CPE device and a frontend dashboard for management.

Features Implemented
Device Simulation (Backend):
SOAP/CWMP Protocol: Implemented Inform, GetParameterValues, and SetParameterValues RPCs using fast-xml-parser.
Endpoint: The device listens for ACS requests on /acs.
Simulation Logic: Can trigger "Manual Inform" events to a configured ACS URL.
Data Model: Simulates standard TR-069 parameters (Device.DeviceInfo..., Device.WiFi...).
Management Dashboard (Frontend):
Parameters: View and edit device parameters (writable ones like WiFi SSID).
Settings: Configure the ACS URL, credentials, and periodic inform interval.
Logs: Real-time view of SOAP messages (XML) sent and received, useful for debugging ACS interactions.
Authentication: Secured with Replit Auth (Login with Replit).
How to Use
Log In: Use the "Log in" button to access the dashboard.
Configure ACS: Go to Settings and set your ACS URL (e.g., http://your-acs-server.com/acs).
Connect: The device will attempt to send an Inform to the ACS. You can also manually trigger one from the Dashboard.
Inspect: Check the Logs page to see the raw XML exchange.
The application is running and ready to communicate with an Auto Configuration Server.

Checkpoint made
Add TR-069 CPE client with management UI and Replit auth
Worked for 4 minutes
Ready to share? Publish this App in a few clicks.
Autoscale Deployment
Primary URL

---

## Podman Container Build & Run (`build-cpe-image.sh`)

Build and run the CPE simulator as a container image with **podman**. The image
is named from the device identity in `acscoll.env`.

### Image name

The image name is `<DEVICE_OUI>-<DEVICE_PRODUCT_CLASS>`, read from
`acscoll.env`:

| Key                       | Example     |
| ------------------------- | ----------- |
| `DEFAULT_CPE_OUI`         | `00259E`    |
| `DEFAULT_CPE_PRODUCTCLASS`| `HG8145V5`  |

Container image repository names must be **lower-case** (OCI rule), so the
image is built as `00259e-hg8145v5:latest`, while the container keeps the
readable original case (`00259E-HG8145V5`).

### Usage

```
./build-cpe-image.sh [command]
```

| Command         | Description                                                       |
| --------------- | ----------------------------------------------------------------- |
| `build`         | Build the image (default command)                                 |
| `run`           | Run the image detached, with `--env-file` + `--add-host`          |
| `build-and-run` | Build, then run                                                   |
| `info`          | Print image name, container name and resolved CR host IP          |

Examples:

```
./build-cpe-image.sh info           # show what will be built / used
./build-cpe-image.sh build          # build localhost/00259e-hg8145v5:latest
./build-cpe-image.sh run            # start the container detached
./build-cpe-image.sh build-and-run  # build and start in one step
```

After `run`, the container serves the UI at `http://localhost:<host-port>`
(container port 5000). Useful commands:

```
podman logs -f 00259E-HG8145V5   # follow the app logs
podman stop 00259E-HG8145V5      # stop the container
```

### Environment overrides

| Variable       | Purpose                                              | Default                        |
| -------------- | ---------------------------------------------------- | ------------------------------ |
| `CPE_ENV_FILE` | env file to read                                     | `acscoll.env`                  |
| `CR_HOST`      | hostname injected into the container `/etc/hosts`    | `speedtest-server-gweu.onrender.com` |
| `CR_HOST_IP`   | manual IP for `--add-host` (auto-resolved if unset)  | auto                          |
| `CPSIM_PORT`   | host port mapped to container port 5000              | `5000`                         |
| `IMAGE_TAG`    | image tag                                            | `latest`                       |

### No-DNS handling

The container has **no DNS**, so the script resolves
`speedtest-server-gweu.onrender.com` on the host at run time and injects it into
the container's `/etc/hosts` via `--add-host`:

```
--add-host speedtest-server-gweu.onrender.com:<IP>
```

If the host cannot resolve it, set the IP manually:

```
CR_HOST_IP=1.2.3.4 ./build-cpe-image.sh run
```

The `acscoll.env` file is normalized (`KEY = value` → `KEY=value`, trailing
whitespace stripped) before being passed to `podman run --env-file`, because
podman does not accept whitespace around `=`.

### Baked test database

The image ships the existing `app.db` (test data: ~3420 seeded TR-069
parameters, settings, users, logs), so the container starts fully populated.
`.dockerignore` excludes all `*.db` files except `app.db` (via `!app.db`).
On a completely empty volume the server self-provisions the schema from
`migrations/` before booting, so a fresh database also comes up cleanly.

### Notes

1. **Snapshots, not live data**: a running `npm run dev` server writes to the
   host `app.db`, so the baked database inside the image is a **snapshot taken
   at build time**. Rebuild whenever you want the latest test data baked in:
   `./build-cpe-image.sh build`.
2. **One-step build & run**: use `./build-cpe-image.sh build-and-run` to build
   and start the container in a single command.
3. **`SKIP_SEED=YES`** is the default in `acscoll.env` — with it, seeding is
   skipped at boot and the baked database is used as-is (parameters stay
   intact). Setting it to `SKIP_SEED=NO` re-imports the data model parameters
   on every start.
