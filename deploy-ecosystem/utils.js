const sleep = (seconds) => new Promise((resolve) => setTimeout(resolve, seconds * 1000));

// Polling delays: each one is paid at every level of the dependency graph
const RUN_STATUS_INTERVAL = 15;
const RUN_DISCOVERY_INTERVAL = 3;
const RUN_DISCOVERY_RETRIES = 60;

async function wait_for_run_completed(octokit, owner, repo, run_id) {
  while (true) {
    const response = await octokit.actions.getWorkflowRun({
      owner,
      repo,
      run_id,
    });
    const { status, conclusion } = response.data;
    console.log(`Status ${repo} ${run_id}: ${status} - ${conclusion}`);
    if (status === "completed") {
      return conclusion;
    }
    await sleep(RUN_STATUS_INTERVAL);
  }
}

async function launch_workflow(octokit, owner, repo, workflow_id, ref) {
  try {
    // created_at has a one second resolution
    const trigger_time = Math.floor(Date.now() / 1000) * 1000;
    console.log(`Dispatch ${repo}::${workflow_id}`);
    await octokit.actions.createWorkflowDispatch({
      owner,
      repo,
      workflow_id,
      ref,
    });
    let run_id = 0;
    for (let retry = 0; retry < RUN_DISCOVERY_RETRIES; retry++) {
      await sleep(RUN_DISCOVERY_INTERVAL);
      const response = await octokit.actions.listWorkflowRuns({
        owner,
        repo,
        workflow_id,
        event: "workflow_dispatch",
      });
      const runs = response.data.workflow_runs.filter(
        (run) => new Date(run.created_at) >= trigger_time
      );
      if (runs.length != 0) {
        run_id = runs[0].id;
        break;
      }
      console.log(`${repo}::${workflow_id} retry ${retry}`);
    }
    if (run_id == 0) {
      throw new Error(`${repo}::${workflow_id} run not found`);
    }
    console.log(`Run ${repo}::${workflow_id} id: ${run_id}`);
    return run_id;
  } catch (error) {
    throw new Error(`${repo}::${workflow_id}: ${error.message}`);
  }
}

export default async function deploy_repository(octokit, owner, repo, ref) {
  const prepare_id = await launch_workflow(
    octokit,
    owner,
    repo,
    "prepare_deploy.yml",
    ref
  );
  const prepare_conclusion = await wait_for_run_completed(
    octokit,
    owner,
    repo,
    prepare_id
  );
  if (prepare_conclusion !== "success") {
    throw new Error(`${repo} failed to prepare deploy`);
  }
  const deploy_id = await launch_workflow(
    octokit,
    owner,
    repo,
    "deploy.yml",
    ref
  );
  const deploy_conclusion = await wait_for_run_completed(
    octokit,
    owner,
    repo,
    deploy_id
  );
  if (deploy_conclusion !== "success") {
    throw new Error(`${repo} failed to deploy`);
  }
}
