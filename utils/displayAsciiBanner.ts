import figlet from "figlet";
import chalk from "chalk";
import type { Config } from "#types/config-types.js";

const displayAsciiBanner = (config: Config): void => {
  try {
    const data = figlet.textSync(config.SERVICE_NAME ?? "Service");
    if (data === "") {
      console.error("❌ No ASCII art data generated");
      return;
    }
    console.clear(); // Clears terminal for a fresh display
    console.log(chalk.blue.bold(data)); // Render ASCII Art in blue
    console.log(chalk.green("Server is running at:"));
    console.log(chalk.cyan.underline(`http://localhost:${config.app.port}`)); // Clickable link in most terminals
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : JSON.stringify(err);
    console.error("❌ Error generating ASCII art:", errorMessage);
  }
};

// Export the function for use in other files
export { displayAsciiBanner };
