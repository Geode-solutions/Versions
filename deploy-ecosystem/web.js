import deploy_repository from "./utils.js";

export default async function web_deploy(octokit, ref) {
  const ogw_microservice = deploy_repository(
    octokit,
    "Geode-solutions",
    "OpenGeodeWeb-Microservice",
    ref
  );
  const ogw_back = ogw_microservice.then(() => {
    return deploy_repository(
      octokit,
      "Geode-solutions",
      "OpenGeodeWeb-Back",
      ref
    );
  });
  const vease_back = ogw_back.then(() => {
    return deploy_repository(octokit, "Geode-solutions", "Vease-Back", ref);
  });
  const vease_modeling_back = ogw_back.then(() => {
    return deploy_repository(
      octokit,
      "Geode-solutions",
      "Vease-Modeling-Back",
      ref
    );
  });
  const pegghy_back = ogw_back.then(() => {
    return deploy_repository(octokit, "Geode-solutions", "PEGGHy-Back", ref);
  });
  const ogw_viewer = ogw_microservice.then(() => {
    return deploy_repository(
      octokit,
      "Geode-solutions",
      "OpenGeodeWeb-Viewer",
      ref
    );
  });
  const vease_viewer = ogw_viewer.then(() => {
    return deploy_repository(octokit, "Geode-solutions", "Vease-Viewer", ref);
  });
  const pegghy_viewer = ogw_viewer.then(() => {
    return deploy_repository(octokit, "Geode-solutions", "PEGGHy-Viewer", ref);
  });
  const ogw_front = Promise.all([ogw_back, ogw_viewer]).then(() => {
    return deploy_repository(
      octokit,
      "Geode-solutions",
      "OpenGeodeWeb-Front",
      ref
    );
  });
  const vease = Promise.all([vease_back, vease_viewer, ogw_front]).then(() => {
    return deploy_repository(octokit, "Geode-solutions", "Vease", ref);
  });
  const vease_modeling = Promise.all([vease_modeling_back, ogw_front]).then(
    () => {
      return deploy_repository(
        octokit,
        "Geode-solutions",
        "Vease-Modeling",
        ref
      );
    }
  );
  const pegghy = Promise.all([pegghy_back, pegghy_viewer, ogw_front]).then(
    () => {
      return deploy_repository(octokit, "Geode-solutions", "PEGGHy", ref);
    }
  );
  await Promise.all([vease, pegghy, vease_modeling]);
}
