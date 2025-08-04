async function wait_for_run_completed(octokit, owner, repo, run_id, timeout) {
  let status = "";
  let conclusion = "";
  while (status !== "completed") {
    console.log(`Retrying ${run_id} in ${timeout}s`);
    await new Promise((resolve) => setTimeout(resolve, timeout * 1000));
    const response = await octokit.actions.getWorkflowRun({
      owner,
      repo,
      run_id,
    });
    const data = response.data;
    status = data.status;
    conclusion = data.conclusion;
    console.log(`Status ${run_id}: ${status} - ${conclusion}`);
  }
  return conclusion;
}

async function launch_workflow(octokit, owner, repo, workflow_id, ref) {
  try {
    let trigger_time = Date.now();
    console.log(`Dispatch ${repo}::${workflow_id}`);
    await octokit.actions.createWorkflowDispatch({
      owner,
      repo,
      workflow_id,
      ref,
    });
    let run_id = 0;
    for (let retry = 0; retry < 20; retry++) {
      await new Promise((resolve) => setTimeout(resolve, 10 * 1000));
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
  await wait_for_run_completed(octokit, owner, repo, prepare_id, 40);
  const deploy_id = await launch_workflow(
    octokit,
    owner,
    repo,
    "deploy.yml",
    ref
  );
  const conclusion = await wait_for_run_completed(
    octokit,
    owner,
    repo,
    deploy_id,
    60
  );
  if (conclusion !== "success") {
    throw new Error(`${repo} failed to deploy`);
  }
}
