import core from "@actions/core";
import { Octokit } from "@octokit/rest";

import cpp_deploy from "./cpp";

const main = async () => {
  try {
    const ref = core.getInput("version");
    const token = core.getInput("token");
    const octokit = new Octokit({ auth: token });
    const workflow = core.getInput("workflow");
    if (workflow === "cpp") {
      await cpp_deploy(octokit, ref);
    } else {
      throw new Error(`Unknown workflow: ${workflow}`);
    }
  } catch (error) {
    core.setFailed(error.message);
  }
};

// Call the main function to run the action
main();
