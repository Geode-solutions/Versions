import core from '@actions/core'
import { Octokit } from '@octokit/rest'

const main = async () => {
  try {
    const ref = core.getInput('version')
    const token = core.getInput('token')
    const octokit = new Octokit({ auth: token })
    const owner = 'Geode-solutions'

    async function wait_for_run_completed(repo, run_id, timeout) {
      let status = ''
      let conclusion = ''
      while (status !== 'completed') {
        console.log(`Retrying ${run_id} in ${timeout}s`)
        await new Promise(resolve => setTimeout(resolve, timeout * 1000))
        const response = await octokit.actions.getWorkflowRun({
          owner,
          repo,
          run_id
        })
        const data = response.data
        status = data.status
        conclusion = data.conclusion
        console.log(`Status ${run_id}: ${status} - ${conclusion}`)
      }
      return conclusion
    }

    async function launch_workflow(repo, workflow_id) {
      try {
        let trigger_time = Date.now()
        console.log(`Dispatch ${repo}::${workflow_id}`)
        await octokit.actions.createWorkflowDispatch({
          owner,
          repo,
          workflow_id,
          ref
        })
        await new Promise(resolve => setTimeout(resolve, 5 * 1000))
        const response = await octokit.actions.listWorkflowRuns({
          owner,
          repo,
          workflow_id,
          event: 'workflow_dispatch'
        })
        const runs = response.data.workflow_runs
          .filter((run) => new Date(run.created_at) >= trigger_time)
        if (runs.length == 0) {
          throw new Error(`${repo}::${workflow_id} run not found`)
        }
        const run_id = runs[0].id
        console.log(`Run ${repo}::${workflow_id} id: ${run_id}`)
        return run_id
      } catch (error) {
        core.setFailed(error.message)
      }
    }

    async function deploy_repository(repo) {
      const prepare_id = await launch_workflow(repo, 'prepare.yml')
      await wait_for_run_completed(repo, prepare_id, 40)
      const deploy_id = await launch_workflow(repo, 'deploy.yml')
      const conclusion = await wait_for_run_completed(repo, deploy_id, 60)
      if (conclusion !== 'success') {
        throw new Error(`${repo} failed to deploy`)
      }
    }


    const og = deploy_repository('OpenGeode')
    const og_io = og.then(() => { return deploy_repository('OpenGeode-IO') })
    const og_geosciences = og.then(() => { return deploy_repository('OpenGeode-Geosciences') })
    const og_geosciencesio = Promise.all([og, og_io, og_geosciences]).then(() => { return deploy_repository('OpenGeode-GeosciencesIO') })
    const og_inspector = og_geosciencesio.then(() => { return deploy_repository('OpenGeode-Inspector') })
    const g_common = og.then(() => { return deploy_repository('Geode-Common_private') })
    const g_viewables = Promise.all([og_geosciencesio, g_common]).then(() => { return deploy_repository('Geode-Viewables_private') })
    const g_conversion = g_common.then(() => { return deploy_repository('Geode-Conversion_private') })
    const g_background = g_common.then(() => { return deploy_repository('Geode-Background_private') })
    const g_explicit = Promise.all([og_inspector, g_conversion, g_background]).then(() => { return deploy_repository('Geode-Explicit_private') })
    const g_numerics = g_common.then(() => { return deploy_repository('Geode-Numerics_private') })
    const g_implicit = Promise.all([g_explicit, g_numerics]).then(() => { return deploy_repository('Geode-Implicit_private') })
    const g_simplex = g_numerics.then(() => { return deploy_repository('Geode-Simplex_private') })
    const g_simplexgeosciences = Promise.all([og_geosciencesio, g_simplex]).then(() => { return deploy_repository('Geode-SimplexGeosciences_private') })
    const g_hybrid = g_simplex.then(() => { return deploy_repository('Geode-Hybrid_private') })
    await Promise.all([g_viewables, g_implicit, g_simplexgeosciences, g_hybrid])
  } catch (error) {
    core.setFailed(error.message)
  }
}

// Call the main function to run the action
main()