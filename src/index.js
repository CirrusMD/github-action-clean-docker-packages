// this file will go away entirely, keeping for reference if needed

const core = require('@actions/core')
const graphql = require('@octokit/graphql')

function getDirection (isDesc) {
  var listDirection
  if (isDesc) {
    listDirection = 'DESC'
  } else {
    listDirection = 'ASC'
  }
  return listDirection
}

function buildVersions (value, index, ary) {
  const ver = ary[index].node.version
  const id = ary[index].node.id
  return { ver, id }
}

async function logPackages (packageVersion, msgHeader) {
  console.log(`${msgHeader}: ${packageVersion.ver} with id: ${packageVersion.id}`)
}

async function removePackages (ghToken, packageVersion, dryRun = true) {
  if (dryRun) {
    core.setOutput('packages-cleaned', `dry run, would remove: ${packageVersion.ver} with id: ${packageVersion.id}`)
  } else {
    core.setOutput('packages-cleaned', `removing version: ${packageVersion.ver} with id: ${packageVersion.id}`)
    const removeResult = await graphql.graphql({
      query: `mutation deletePackage($packageId: String!, $clientId: String!) {
  deletePackageVersion(input: {packageVersionId: $packageId, clientMutationId: $clientId}) {
    success
  }
}`,

      packageId: packageVersion.id,
      clientId: 'github-action-clean-docker-packages',
      headers: {
        authorization: `token ${ghToken}`,
        accept: 'application/vnd.github.package-deletes-preview+json'
      }
    })
    console.log(`remove result: ${removeResult}`)
  }
}
async function listPackages (ghToken, repoName, repoOwner, packageName, packageCount, isDesc) {
  const listDirection = getDirection(isDesc)
  const dockerPkg = await graphql.graphql({
    query: `query dockerPkg($repoOwner: String!, $repoName: String!, $packageName: String!, $packageCount: Int, $listDirection: String!){
    repository(name:$repoName, owner:$repoOwner)
  {
    packages(packageType:DOCKER, last:$packageCount, names:[$packageName] ) {
      edges{
        node{
          id,
          name,
          versions(first:$packageCount, orderBy: {field: CREATED_AT, direction: $listDirection}){
            edges{
              node{
                id,
                version,
                package{name}
              }
            }
          }
        }
      }   
    }
  }
}`,
    repoOwner: repoOwner,
    repoName: repoName,
    packageName: packageName,
    packageCount: packageCount,
    listDirection: listDirection,
    headers: {
      authorization: `token ${ghToken}`
    }
  }
  )
  return dockerPkg.repository.packages.edges[0].node.versions.edges
}

async function getPackages (ghToken, repoName, repoOwner, packageName, packageCount = 100) {
  const token = ghToken
  let pkgDescList = await listPackages(token, repoName, repoOwner, packageName, packageCount, true)
  let pkgAscList = await listPackages(token, repoName, repoOwner, packageName, packageCount, false)
  // get just a list of versions and the begin and end of the list
  pkgDescList = pkgDescList.map(buildVersions)
  pkgAscList = pkgAscList.map(buildVersions)
  const fullList = [...new Set([...pkgDescList, ...pkgAscList])]
  const keepList = fullList.filter(({ id: id1 }) => pkgDescList.some(({ id: id2 }) => id1 === id2))
  let delList = fullList.filter(({ id: id1 }) => !keepList.some(({ id: id2 }) => id1 === id2))

  // remove docker-base-layer, this is special
  delList = delList.filter(function (item) {
    return item.ver !== 'docker-base-layer'
  })
  return { delList, keepList }
}
function isTruthy (val) {
  if (val.toString().toLowerCase() === 'true') {
    return true
  } else {
    return false
  }
}
// main
async function main () {
  const ghRepo = process.env.GITHUB_REPOSITORY
  const ghToken = core.getInput('gh-token')
  const numKeep = parseInt(core.getInput('num-keep'), 10)
  const dryRun = isTruthy(core.getInput('dry-run'))
  const dockerPackage = core.getInput('docker-package')
  const repoOwner = ghRepo.split('/')[0]
  const repoName = ghRepo.split('/')[1]

  try {
    const { delList, keepList } = await getPackages(ghToken, repoName, repoOwner, dockerPackage, numKeep)
    keepList.forEach(pkg => logPackages(pkg, 'we will keep:'))
    delList.forEach(pkg => logPackages(pkg, 'we will remove:'))
    delList.forEach(pkg => removePackages(ghToken, pkg, dryRun))
  } catch (e) {
    core.setFailed(`github-action-clean-docker-packages failed for reason: ${e}`)
  }
}

main()
