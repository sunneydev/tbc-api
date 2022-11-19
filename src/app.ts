import { TBC } from "./tbc";
import prompts from "prompts";
import { encryptJWE } from "./utils";

const main = async () => {
  const tbc = new TBC();

  const { username, password } = await prompts([
    {
      type: "text",
      name: "username",
      message: "Enter your username",
    },
    {
      type: "password",
      name: "password",
      message: "Enter your password",
    },
  ]);

  const authResponse = await tbc.auth(username, password);

  const { signatures, ...transaction } = authResponse.data.transaction;

  const signature = signatures[0];

  if (!signature) {
    throw new Error("No signature found");
  }

  const { accessToken, publicKey } = signature;

  // take code from user input
  const { code } = await prompts({
    type: "text",
    name: "code",
    message: "Enter code",
    validate: (value) => value.length === 4,
  });

  const certifyPayload = tbc.getCertifyPayload(transaction, {
    accessToken,
    challengeCode: code,
  });

  const jwe = await encryptJWE(publicKey, JSON.stringify(certifyPayload));

  await tbc.certifyLogin(transaction.id, {
    signatures: [{ ...signature, authenticationCode: jwe }],
  });

  console.log("Login successful");
};

main()
  .then(() => console.log("Done"))
  .catch(console.error);
