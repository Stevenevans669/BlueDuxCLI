import { Command } from "commander";

const program = new Command();

program
  .name("bluedux")
  .description("Bluedux CLI")
  .version("0.0.1")
  .option("--json", "Output as JSON");

program
  .command("ping")
  .description("Check connectivity")
  .action(() => {
    if (program.opts().json) {
      console.log(JSON.stringify({ result: "pong" }));
    } else {
      console.log("pong");
    }
  });

program.parse();
