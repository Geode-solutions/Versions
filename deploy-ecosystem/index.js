import core from "@actions/core";
import { Octokit } from "@octokit/rest";

import cpp_deploy from "./cpp.js";
import web_deploy from "./web.js";

const sleep = (seconds) => new Promise((resolve) => setTimeout(resolve, seconds * 1000));

// GitHub API transiently answers 5xx: retry reads only, a retried dispatch could
// launch a workflow twice
async function retry_transient_get(request, options, retries = 5, base_delay = 5) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await request(options);
    } catch (error) {
      const transient = !error.status || error.status >= 500 || error.status === 429;
      if (options.method !== "GET" || !transient || attempt >= retries) {
        throw error;
      }
      const delay = base_delay * attempt;
      console.log(
        `${options.method} ${options.url} failed (${error.status || error.message}), retrying in ${delay}s... (${attempt}/${retries})`,
      );
      await sleep(delay);
    }
  }
}

try {
  const ref = core.getInput("version");
  const token = core.getInput("token");
  const octokit = new Octokit({ auth: token });
  octokit.hook.wrap("request", retry_transient_get);
  const workflow = core.getInput("workflow");
  if (workflow === "cpp") {
    cpp_deploy(octokit, ref);
  } else if (workflow === "web") {
    web_deploy(octokit, ref);
  } else {
    throw new Error(`Unknown workflow: ${workflow}`);
  }
} catch (error) {
  core.setFailed(error.message);
}
