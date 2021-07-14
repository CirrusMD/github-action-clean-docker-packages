const {Octokit} = require('@octokit/rest');

async function createOcto(cfg) {
  return new Octokit({
    auth: cfg.ghToken,
  });
}

module.exports.isTruthy = function isTruthy(val) {
  if (val.toString().toLowerCase() === 'true') {
    return true;
  } else {
    return false;
  }
};

module.exports.isValidType = function isValidType(val) {
  const formattedVal = val.toString().toLowerCase();

  if (formattedVal === 'docker' || formattedVal === 'container' ) {
    return formattedVal;
  } else {
    throw new Error('Invalid package-type! Must be type <docker> or <container>');
  }
};

module.exports.getPackages = async function getPackages(cfg) {
  const octoClient = await createOcto(cfg);

  const pkg = await octoClient.paginate( await octoClient.rest.packages.getAllPackageVersionsForPackageOwnedByOrg({
    package_type: cfg.packageType,
    package_name: cfg.packageName,
    org: cfg.repoOwner,
    state: 'active',
    per_page: 100,
  }));


  // pkgs are returned sorted by most recently created
  return pkg;
};

module.exports.parsePackages = async function parsePackages(cfg, pkg) {
  do {
    const deletePkg = pkg.pop();
    await this.deletePackages(deletePkg, cfg);
    console.log('Deleted package:');
    console.log(deletePkg);
  } while ((pkg.length - 1) >= cfg.numKeep);
  return pkg;
};

module.exports.deletePackages = async function deletePackages(pkg, cfg) {
  const octoClient = await createOcto(cfg);

  const result = await octoClient.rest.packages.deletePackageVersionForOrg({
    package_type: pkg.metadata.package_type,
    package_name: cfg.packageName,
    package_version_id: pkg.id,
    org: cfg.repoOwner,
  });

  return result;
};

module.exports.checkPackages = async function checkPackages(pkg, cfg) {
  if (pkg.length <= 10) {
    throw new Error('Package repository contains less than or equal to 10 packages! Cannot clean repositories with less than 10 packages.');
    return false;
  } else if (pkg.length <= cfg.numKeep) {
    throw new Error('Package repository contains less than or equal the number of packages requested to keep! Cannot clean repositories with less packages than the number requested to keep.');
    return false;
  } else {
    return true;
  }
};
