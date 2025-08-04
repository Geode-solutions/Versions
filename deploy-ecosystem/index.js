import core from "@actions/core";
import { Octokit } from "@octokit/rest";

import cpp_deploy from "./cpp.js";
import py_deploy from "./py.js";

try {
  const ref = core.getInput("version");
  const token = core.getInput("token");
  const octokit = new Octokit({ auth: token });
  const workflow = core.getInput("workflow");
  if (workflow === "cpp") {
    cpp_deploy(octokit, ref);
  } else if (workflow === "py") {
    py_deploy(octokit, ref);
  } else {
    throw new Error(`Unknown workflow: ${workflow}`);
  }
} catch (error) {
  core.setFailed(error.message);
}
