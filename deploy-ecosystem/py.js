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
  await Promise.all([ogw_back, vease_back]);
}
