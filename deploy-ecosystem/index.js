import core from "@actions/core";
import { Octokit } from "@octokit/rest";

const main = async () => {
  try {
    const ref = core.getInput("version");
    const token = core.getInput("token");
    const octokit = new Octokit({ auth: token });
    const owner = "Geode-solutions";

    async function wait_for_run_completed(repo, run_id, timeout) {
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

    async function launch_workflow(repo, workflow_id) {
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

    async function deploy_repository(repo) {
      const prepare_id = await launch_workflow(repo, "prepare_deploy.yml");
      await wait_for_run_completed(repo, prepare_id, 40);
      const deploy_id = await launch_workflow(repo, "deploy.yml");
      const conclusion = await wait_for_run_completed(repo, deploy_id, 60);
      if (conclusion !== "success") {
        throw new Error(`${repo} failed to deploy`);
      }
    }

    const og = deploy_repository("OpenGeode");
    const og_stochastic = deploy_repository("OpenGeode-Stochastic");
    const og_io = og.then(() => {
      return deploy_repository("OpenGeode-IO");
    });
    const og_geosciences = og.then(() => {
      return deploy_repository("OpenGeode-Geosciences");
    });
    const og_geosciencesio = Promise.all([og, og_io, og_geosciences]).then(
      () => {
        return deploy_repository("OpenGeode-GeosciencesIO");
      }
    );
    const og_inspector = og_geosciencesio.then(() => {
      return deploy_repository("OpenGeode-Inspector");
    });
    const g_common = og.then(() => {
      return deploy_repository("Geode-Common_private");
    });
    const g_viewables = Promise.all([og_geosciencesio, g_common]).then(() => {
      return deploy_repository("Geode-Viewables_private");
    });
    const g_conversion = g_common.then(() => {
      return deploy_repository("Geode-Conversion_private");
    });
    const g_background = g_common.then(() => {
      return deploy_repository("Geode-Background_private");
    });
    const g_numerics = g_common.then(() => {
      return deploy_repository("Geode-Numerics_private");
    });
    const g_simplex = Promise.all([
      og_io,
      og_inspector,
      g_numerics,
      g_background,
    ]).then(() => {
      return deploy_repository("Geode-Simplex_private");
    });
    const g_simplexgeosciences = Promise.all([
      og_geosciencesio,
      g_conversion,
      g_simplex,
    ]).then(() => {
      return deploy_repository("Geode-SimplexGeosciences_private");
    });
    const g_hybrid = g_simplex.then(() => {
      return deploy_repository("Geode-Hybrid_private");
    });
    const g_hybrid_geosciences = Promise.all([
      og_geosciences,
      og_inspector,
      g_conversion,
      g_background,
    ]).then(() => {
      return deploy_repository("Geode-Hybrid_Geosciences_private");
    });
    const g_explicit = Promise.all([
      og_inspector,
      g_conversion,
      g_background,
    ]).then(() => {
      return deploy_repository("Geode-Explicit_private");
    });
    const g_implicit = Promise.all([g_explicit, g_numerics, g_simplex]).then(
      () => {
        return deploy_repository("Geode-Implicit_private");
      }
    );
    const g_feflow = Promise.all([g_explicit, g_implicit, g_simplex]).then(
      () => {
        return deploy_repository("Geode-FEFLOW");
      }
    );

    await Promise.all([
      og_stochastic,
      g_viewables,
      g_implicit,
      g_simplexgeosciences,
      g_hybrid,
      g_hybrid_geosciences,
      g_feflow,
    ]);
  } catch (error) {
    core.setFailed(error.message);
  }
};

// Call the main function to run the action
main();
