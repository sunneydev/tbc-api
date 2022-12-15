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

  // authenticate once with your credentials
  await tbc.auth();

  // get your accounts
  const accounts = await tbc.getAccounts();
}
```
