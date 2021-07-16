const core = require('@actions/core')
// probably dont need le octokit, this is githubs rest client 
const { Octokit } = require('@octokit/rest')


module.exports.isTruthy = function isTruthy (val) {
    if (val.toString().toLowerCase() === 'true') {
        return true
    } else {
        return false
    }
}

module.exports.isValidType = function isValidType (val) {
    let formattedVal = val.toString().toLowerCase()
    
    if (formattedVal === 'docker' || formattedVal === "container" ) {
        return formattedVal
    } else {
        throw new Error("Invalid package-type! Must be type <docker> or <container>") 
    }
}



// create a function that deletes everything older than the last 600
// use the constant numKeep
// if the total amount of packages is < 600 exit with nice message
// le yeet

async function createOcto(cfg){
    return new Octokit({
        auth: cfg.ghToken
    })
}

module.exports.getPackages = async function getPackages(cfg){
    let octoClient = await createOcto(cfg)

    let pkg = await octoClient.paginate( await octoClient.rest.packages.getAllPackageVersionsForPackageOwnedByOrg({
        package_type: cfg.packageType,
        package_name: cfg.packageName,
        org: cfg.repoOwner,
        state: "active",
        per_page: 50
    }))


// pkgs are returned sorted by most recently created
return pkg
}

module.exports.parsePackages = async function parsePackages(cfg,pkg){
console.log("Were keepin " + cfg.numKeep)
    do {
        let deletePkg = pkg.pop()
        // console.log("Here comes deletePkg")
        // console.log(deletePkg)
        await this.deletePackages(deletePkg,cfg)
    } while (pkg.length >= cfg.numKeep);

    return pkg
}

module.exports.deletePackages = async function deletePackages (pkg,cfg){
    let octoClient = await createOcto(cfg)

    console.log("deletePkg Function")
    console.log(pkg)
    console.log("package_type = " + pkg.metadata.package_type)
    console.log("package_name = " + pkg.name)
    console.log("org = " + cfg.repoOwner)
    console.log('end')
    let result = await octoClient.rest.packages.deletePackageForOrg({
        package_type: pkg.metadata.package_type,
        package_name: pkg.name,
        org:cfg.repoOwner
      });

    console.log(result)
    return result
}
