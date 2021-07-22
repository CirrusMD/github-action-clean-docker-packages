const core = require('@actions/core');
const repoConfig = require('./repoconfig');
const repoUtil = require('./repoutil');


// main

async function main() {
  const ghRepo = process.env.GITHUB_REPOSITORY || 'CirrusMD/github-action-clean-docker-packages';
  const ghToken = core.getInput('gh-token') || process.env.GITHUB_TOKEN;
  const numKeep = parseInt(core.getInput('num-keep'), 10) || 13;
  const dryRun = repoUtil.isTruthy(core.getInput('dry-run') || true);
  const packageName = core.getInput('package-name') || 'github-action-clean-docker-packages-test';
  const packageType = repoUtil.isValidType(core.getInput('package-type') || 'container');
  const cfg = new repoConfig(ghRepo, ghToken, numKeep, dryRun, packageName, packageType);

  const pkg = await repoUtil.getPackages(cfg).catch((e) => {
    console.log('unable to get packages: ', e.message);
  });
  const validPkg = await repoUtil.checkPackages(pkg, cfg).catch((e) => {
    console.log('failed to check package checks', e.message);
  });


  if (validPkg === true) {
    try {
      const pkgKeep = await repoUtil.parsePackages(cfg, pkg);
      console.log('Keeping the following Packages:');
      console.log(pkgKeep);
    } catch (e) {
      core.setFailed(`github-action-clean-docker-packages failed for reason: ${e}`);
    }
  }
}

main();
