const sleep = (seconds) => new Promise((resolve) => setTimeout(resolve, seconds * 1000));

// Polling delays: each one is paid at every level of the dependency graph
const RUN_STATUS_INTERVAL = 15;
const RUN_DISCOVERY_INTERVAL = 3;
const RUN_DISCOVERY_RETRIES = 60;
const RUN_INFRA_RETRIES = 2;

// A job failing in "Set up job" (or before any step) is a GitHub infrastructure
// error, e.g. a transient codeload failure while downloading an action
async function has_infra_failure(octokit, owner, repo, run_id) {
  const jobs = await octokit.paginate(octokit.actions.listJobsForWorkflowRun, {
    owner,
    repo,
    run_id,
    filter: "latest",
    per_page: 100,
  });
  const failed_jobs = jobs.filter((job) => job.conclusion === "failure");
  return (
    failed_jobs.length != 0 &&
    failed_jobs.every(
      (job) =>
        !job.steps ||
        job.steps.length == 0 ||
        job.steps.some((step) => step.name === "Set up job" && step.conclusion === "failure"),
    )
  );
}

// Prepare deploy only goes past its semantic-release dry run when a new release
// is due: when all other jobs were skipped, Deploy would not release either
async function has_new_release(octokit, owner, repo, run_id) {
  const jobs = await octokit.paginate(octokit.actions.listJobsForWorkflowRun, {
    owner,
    repo,
    run_id,
    filter: "latest",
    per_page: 100,
  });
  return jobs.some((job) => !job.name.endsWith("semantic-release") && job.conclusion !== "skipped");
}

async function wait_for_run_success(octokit, owner, repo, run_id) {
  for (let attempt = 0; ; attempt++) {
    const conclusion = await wait_for_run_completed(octokit, owner, repo, run_id);
    if (conclusion === "success") {
      return true;
    }
    if (
      conclusion !== "failure" ||
      attempt >= RUN_INFRA_RETRIES ||
      !(await has_infra_failure(octokit, owner, repo, run_id))
    ) {
      return false;
    }
    console.log(`Rerun ${repo} ${run_id}: infrastructure failure`);
    await octokit.actions.reRunWorkflowFailedJobs({ owner, repo, run_id });
    await sleep(RUN_STATUS_INTERVAL);
  }
}

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
        (run) => new Date(run.created_at) >= trigger_time,
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
  const prepare_id = await launch_workflow(octokit, owner, repo, "prepare_deploy.yml", ref);
  if (!(await wait_for_run_success(octokit, owner, repo, prepare_id))) {
    throw new Error(`${repo} failed to prepare deploy`);
  }
  if (!(await has_new_release(octokit, owner, repo, prepare_id))) {
    console.log(`Skip ${repo}::deploy.yml: no new release`);
    return;
  }
  const deploy_id = await launch_workflow(octokit, owner, repo, "deploy.yml", ref);
  if (!(await wait_for_run_success(octokit, owner, repo, deploy_id))) {
    throw new Error(`${repo} failed to deploy`);
  }
}
