import { TBC } from "./tbc";
import prompts from "prompts";

async function main() {
  const prompt = await prompts({
    type: "confirm",
    name: "login",
    message: "Authenticate with TBC Bank? 🔐",
    initial: true,
  });

  if (prompt.login) {
    const tbc = new TBC();

    try {
      await tbc.auth.withCredentials({
        credentials: {
          username: "SUNNEY",
          password: "Sani1234@te",
        },
        saveSession: true,
        trustDevice: true,
      });
    } catch (e: any) {
      console.log(e?.message);
    }
  }
}

main();
