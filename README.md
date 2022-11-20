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

  await tbc.auth({ username: "username", password: "password" });

  const info = await tbc.getUserInfo();
  console.log(info.username);
}
```
