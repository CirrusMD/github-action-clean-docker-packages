const core = require('@actions/core')
const repoConfig = require('./repoconfig')
const repoUtil = require('./repoutil')
const util = require('util')

// main
async function main () {
    // most config vars fall back on defaults to ease local testing
    // local testing requires that you export/set the env var GITHUB_TOKEN
    //CirrusMD/github-action-clean-docker-packages"
    let ghRepo = process.env.GITHUB_REPOSITORY || "CirrusMD/github-action-clean-docker-packages"
    let ghToken = core.getInput('gh-token') || process.env.GITHUB_TOKEN
    let numKeep = parseInt(core.getInput('num-keep'), 10) || 2
    let dryRun = repoUtil.isTruthy(core.getInput('dry-run') || true)
    //github-action-clean-docker-packages-test
    let packageName = core.getInput('package-name') || 'github-action-clean-docker-packages-test'
    let packageType = repoUtil.isValidType(core.getInput('package-type') || 'container')
    let cfg = new repoConfig(ghRepo, ghToken, numKeep, dryRun, packageName, packageType)
    console.log(util.inspect(cfg, {depth: null}))
    //let octoClient = await repoUtil.createOcto(cfg)
    // Promise.all([octoClient]).then((values) => {
    //     console.log(`promise values: ${values}`)
    // })
    
    let pkg = await repoUtil.getPackages(cfg)
    // console.log("------BEGIN-------")
    // console.log(util.inspect(okg, {depth: null}))

    // console.log(packages.length)
    // console.log("------END-------")

    let pkgKeep = await repoUtil.parsePackages(cfg,pkg)

    // console.log("------BEGIN-------")
    // console.log(util.inspect(packages, {depth: null}))

    // console.log(packages.length)
    // console.log("------END-------")


    /*
    await octokit.request('GET /orgs/{org}/packages/{package_type}/{package_name}/versions', {
    package_type: 'package_type',
    package_name: 'package_name',
    org: 'org'
    })
    */
    //console.log(typeof octoClient)
    //console.log("tacos")

    /*
    try {
        const { delList, keepList } = await getPackages(ghToken, repoName, repoOwner, dockerPackage, numKeep)
        keepList.forEach(pkg => logPackages(pkg, 'we will keep:'))
        delList.forEach(pkg => logPackages(pkg, 'we will remove:'))
        delList.forEach(pkg => removePackages(ghToken, pkg, dryRun))
    } catch (e) {
        core.setFailed(`github-action-clean-docker-packages failed for reason: ${e}`)
    }
    */
}
main()
