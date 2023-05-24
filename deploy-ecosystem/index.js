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
      while (status !== 'completed') {
        await new Promise(resolve => setTimeout(resolve, timeout * 1000))
        const response = await octokit.actions.getWorkflowRun({
          owner,
          repo,
          run_id
        })
        const data = response.data
        console.log(`Status ${data.status} - ${data.conclusion}`)
        status = data.status
      }
    }

    async function launch_workflow(repo, workflow_id) {
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
    }

    async function deploy_repository(repo) {
      const prepare_id = await launch_workflow(repo, 'prepare.yml')
      await wait_for_run_completed(repo, prepare_id, 40)
      console.log("wait")
      const deploy_id = await launch_workflow(repo, 'deploy.yml')
    }


    deploy_repository('Geode-Common_private')

    // repos.split('').forEach(owner_repo => {
    //   if (!owner_repo.length) {
    //     return
    //   }
    //   const owner_repo_array = owner_repo.split('/')
    //   let owner = 'Geode-solutions'
    //   let repo = owner_repo_array[0]
    //   if (owner_repo_array.length == 2) {
    //     owner = owner_repo_array[0]
    //     repo = owner_repo_array[1]
    //   }
    //   let promise = new Promise(function (resolve) {
    //     console.log('Looking for repository:', repo)
    //     const outputFile = repo.concat(file)

    //     const query = version === 'master' ?
    //       octokit.repos.getLatestRelease({ owner, repo }).then(release => release.data.id) :
    //       octokit.repos.listReleases({ owner, repo }).then(releases => releases.data[0].id)
    //     query.then(release_id => {
    //       octokit.repos.listReleaseAssets({ owner, repo, release_id })
    //         .then(assets => {
    //           console.log(assets)
    //           const asset =
    //             assets.data.find(asset => asset.name.includes(file))
    //           console.log('Asset name:', asset.name)
    //           request({
    //             url: asset.url,
    //             method: 'GET',
    //             headers: {
    //               accept: 'application/octet-stream',
    //               Authorization: 'Bearer ' + token,
    //               'User-Agent': ''
    //             }
    //           })
    //             .pipe(fs.createWriteStream(outputFile))
    //             .on('finish', function () {
    //               const extension = outputFile.split('.').pop()
    //               console.log('Extension:', extension)
    //               if (extension == 'zip') {
    //                 console.log('Unzipping', asset.name)
    //                 fs.createReadStream(outputFile)
    //                   .pipe(unzipper.Extract(
    //                     { path: process.env.GITHUB_WORKSPACE }))
    //                   .on('close', function () {
    //                     let extract_name = asset.name.slice(0, -4)
    //                     if (extract_name.endsWith('-private')) {
    //                       extract_name = extract_name.slice(0, -8)
    //                     }
    //                     console.log('Unzip to:', extract_name)
    //                     const result = path.join(
    //                       process.env.GITHUB_WORKSPACE, extract_name)
    //                     console.log('Result:', result)
    //                     fs.unlinkSync(outputFile)
    //                     resolve(result)
    //                   })
    //               } else if (extension == 'gz') {
    //                 console.log('Untaring', asset.name)
    //                 fs.createReadStream(outputFile)
    //                   .pipe(tar.x())
    //                   .on('close', function () {
    //                     let extract_name = asset.name.slice(0, -7)
    //                     if (extract_name.endsWith('-private')) {
    //                       extract_name = extract_name.slice(0, -8)
    //                     }
    //                     console.log('Untar to:', extract_name)
    //                     const result = path.join(
    //                       process.env.GITHUB_WORKSPACE, extract_name)
    //                     console.log('Result:', result)
    //                     fs.unlinkSync(outputFile)
    //                     resolve(result)
    //                   })
    //               }
    //             })
    //         })
    //     })
    //   })
    //   results.push(promise)
    //   Promise.all(results).then(outputs => {
    //     let result = ''
    //     outputs.forEach(output => result += output + '')
    //     core.setOutput('path', result)
    //     console.log('Final result:', result)
    //   })
    // }
  } catch (error) {
    core.setFailed(error.message)
  }
}

// Call the main function to run the action
main()