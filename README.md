# A Typescript SDK for TBC Bank

### Installation

```bash
npm install tbc-api
```

### Usage

```typescript
import { TBC } from "tbc-api";

const main = async () => {
	const tbc = new TBC();

	await tbc.auth(); // will ask for username, password and OTP from console

	await tbc.saveSession(); // will save session to file for future use

	const accounts = await tbc.getAccounts();
};
```
