# Open the app from your phone or another computer

The `./setup.sh` preview is loopback-only and cannot be opened from another device. Use the host-development workflow for LAN testing.

1. Start [local development](Getting-Started-%28Local%29) with password checking enabled.
2. Connect both devices to the same trusted network.
3. Find the development computer's LAN address. On macOS:

   ```bash
   ipconfig getifaddr en0
   ```

   If that returns nothing, try `en1` or check the active network connection in System Settings.

4. On the other device, open **`http://<computer-ip>:4200`**, for example `http://192.168.1.20:4200`.

On the phone, `localhost` means the phone itself—not the computer running B26.

## Why this works

The checked-in Angular start command binds to `0.0.0.0`. The setup-script Docker frontend instead binds only to `127.0.0.1:4200`. The frontend proxies API calls to the backend, so use the frontend address on the other device rather than changing API URLs in the browser.

## If the page does not load

- Confirm the app works at localhost:4200 on the development computer first.
- Check the IP address has not changed.
- Allow the development server / Docker through the computer firewall as appropriate.
- Guest Wi-Fi, VPNs, and client isolation may prevent devices from reaching each other.
- If the frontend loads but API calls fail, check the backend health and proxy logs.

Use a normal test account with password checking enabled for shared-network testing. The email-only development bypass accepts any existing user's email from clients that can reach the backend.

[Dev login](Dev-Login-and-Accounts) · [Troubleshooting](Troubleshooting)
