# Apple iOS Signing Credentials (Local)

Place your Apple Developer distribution credentials in this folder according to the [Expo Local Credentials Documentation](https://docs.expo.dev/app-signing/local-credentials/):

### 1. Required Files
* **Distribution Certificate**: e.g., `dist-cert.p12`
* **Provisioning Profile**: e.g., `JacxiShipping_AppStore.mobileprovision`
* **App Store Connect API Key (Optional for auto-submission)**: e.g., `AuthKey_XXXXXX.p8`

---

### 2. Configuring `credentials.json`
Create a `credentials.json` file at the root of `mobile/` (refer to `credentials.example.json`):

```json
{
  "ios": {
    "provisioningProfilePath": "./credentials/ios/JacxiShipping_AppStore.mobileprovision",
    "distributionCertificate": {
      "path": "./credentials/ios/dist-cert.p12",
      "password": "YOUR_P12_PASSWORD"
    }
  }
}
```

---

### 3. Building with Local Credentials
To build with EAS CLI using your local credentials without uploading them to Expo servers:

```bash
npx eas build --platform ios --profile production --local
# or with your credentials.json:
npx eas build --platform ios --profile production
```

> **Security Note**: This directory's certificates (`*.p12`, `*.p8`, `*.mobileprovision`) and `credentials.json` are ignored by `.gitignore` to prevent secret leakage.
