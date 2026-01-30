import deploy_repository from "./utils.js";

export default async function cpp_deploy(octokit, ref) {
  const og = deploy_repository(octokit, "Geode-solutions", "OpenGeode", ref);
  const og_stochastic = og.then(() => {
    return deploy_repository(
      octokit,
      "Geode-solutions",
      "OpenGeode-Stochastic",
      ref
    );
  });
  const og_io = og.then(() => {
    return deploy_repository(octokit, "Geode-solutions", "OpenGeode-IO", ref);
  });
  const og_geosciences = og.then(() => {
    return deploy_repository(
      octokit,
      "Geode-solutions",
      "OpenGeode-Geosciences",
      ref
    );
  });
  const og_geosciencesio = Promise.all([og, og_io, og_geosciences]).then(() => {
    return deploy_repository(
      octokit,
      "Geode-solutions",
      "OpenGeode-GeosciencesIO",
      ref
    );
  });
  const og_inspector = og_geosciencesio.then(() => {
    return deploy_repository(
      octokit,
      "Geode-solutions",
      "OpenGeode-Inspector",
      ref
    );
  });
  const g_common = og.then(() => {
    return deploy_repository(
      octokit,
      "Geode-solutions",
      "Geode-Common_private",
      ref
    );
  });
  const g_viewables = Promise.all([og_geosciencesio, g_common]).then(() => {
    return deploy_repository(
      octokit,
      "Geode-solutions",
      "Geode-Viewables_private",
      ref
    );
  });
  const g_conversion = g_common.then(() => {
    return deploy_repository(
      octokit,
      "Geode-solutions",
      "Geode-Conversion_private",
      ref
    );
  });
  const g_background = g_common.then(() => {
    return deploy_repository(
      octokit,
      "Geode-solutions",
      "Geode-Background_private",
      ref
    );
  });
  const g_numerics = g_common.then(() => {
    return deploy_repository(
      octokit,
      "Geode-solutions",
      "Geode-Numerics_private",
      ref
    );
  });
  const g_simplex = Promise.all([
    og_io,
    og_inspector,
    g_numerics,
    g_background,
  ]).then(() => {
    return deploy_repository(
      octokit,
      "Geode-solutions",
      "Geode-Simplex_private",
      ref
    );
  });
  const g_simplexgeosciences = Promise.all([
    og_geosciencesio,
    g_conversion,
    g_simplex,
  ]).then(() => {
    return deploy_repository(
      octokit,
      "Geode-solutions",
      "Geode-SimplexGeosciences_private",
      ref
    );
  });
  const g_hybrid = g_simplex.then(() => {
    return deploy_repository(
      octokit,
      "Geode-solutions",
      "Geode-Hybrid_private",
      ref
    );
  });
  const g_hybrid_geosciences = Promise.all([
    og_geosciences,
    og_inspector,
    g_conversion,
    g_background,
  ]).then(() => {
    return deploy_repository(
      octokit,
      "Geode-solutions",
      "Geode-Hybrid_Geosciences_private",
      ref
    );
  });
  const g_explicit = Promise.all([
    og_inspector,
    g_conversion,
    g_background,
  ]).then(() => {
    return deploy_repository(
      octokit,
      "Geode-solutions",
      "Geode-Explicit_private",
      ref
    );
  });
  const g_implicit = Promise.all([g_explicit, g_numerics, g_simplex]).then(
    () => {
      return deploy_repository(
        octokit,
        "Geode-solutions",
        "Geode-Implicit_private",
        ref
      );
    }
  );
  const g_feflow = Promise.all([g_explicit, g_implicit, g_simplex]).then(() => {
    return deploy_repository(octokit, "Geode-solutions", "Geode-DHI", ref);
  });
  const g_slb = Promise.all([g_explicit, g_simplex]).then(() => {
    return deploy_repository(octokit, "Geode-solutions", "Geode-SLB", ref);
  });
  const g_fracsima = Promise.all([g_explicit, g_simplex]).then(() => {
    return deploy_repository(octokit, "Geode-solutions", "Geode-Fracsima", ref);
  });

  await Promise.all([
    og_stochastic,
    g_viewables,
    g_implicit,
    g_simplexgeosciences,
    g_hybrid,
    g_hybrid_geosciences,
    g_feflow,
    g_slb,
    g_fracsima
  ]);
}
