# A Typescript SDK for TBC Bank

### Installation

```bash
npm install tbc-api
```

### Usage

```typescript
import { TBC } from "tbc-api";

async function main() {
  const tbc = new TBC();

  // authenticate with your credentials
  await tbc.auth.withCredentials({
    username: "username",
    password: "password",
  });

  // authenticate with your previous session
  // (session is obtained after a successful authentication)
  await tbc.auth.withSession();

  // trust your device, so you don't have to enter the OTP code every time
  await tbc.auth.trustDevice();
}
```
