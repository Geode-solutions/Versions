import deploy_repository from "./utils.js";

export default async function py_deploy(octokit, ref) {
  const ogw_back = deploy_repository(
    octokit,
    "Geode-solutions",
    "OpenGeodeWeb-Back",
    ref
  );
  const vease_back = ogw_back.then(() => {
    return deploy_repository(octokit, "Geode-solutions", "Vease-Back", ref);
  });
  const ogw_viewer = deploy_repository(
    octokit,
    "Geode-solutions",
    "OpenGeodeWeb-Viewer",
    ref
  );
  const vease_viewer = ogw_viewer.then(() => {
    return deploy_repository(octokit, "Geode-solutions", "Vease-Viewer", ref);
  });
  await Promise.all([vease_back, vease_viewer]);
}
