import tbc from "./tbc";
import prompts from "prompts";

async function main() {
  const prompt = await prompts({
    type: "confirm",
    name: "login",
    message: "Authenticate with TBC Bank? 🔐",
    initial: true,
  });

  if (prompt.login) {
    try {
      await tbc.auth.withCredentials({ saveSession: true, trustDevice: true });
    } catch (e: any) {
      console.log(e?.message);
    }
  }
}

main();
