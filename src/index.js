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
      query: `nukePkg($pkgId: String!, $clientID: String!){
  deletePackageVersion(input: {packageVersionId: $pkgId,clientMutationId: "$clientId})
    {
    success
  }
}
`,

      packageVersion: packageVersion,
      clientID: 'github-action-clean-docker-packages',
      headers: {
        authorization: `token ${ghToken}`
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
          versions(last:$packageCount, orderBy: {field: CREATED_AT, direction: $listDirection}){
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
  let delList = pkgDescList.filter(x => !pkgAscList.includes(x))
  const keepList = pkgAscList.filter(x => !delList.includes(x))
  // remote docker-base-layer, this is special
  delList = delList.filter(function (item) {
    return item.ver !== 'docker-base-layer'
  })
  return { delList, keepList }
}

// main
async function main () {
  const ghRepo = process.env.GITHUB_REPOSITORY
  const ghToken = core.getInput('gh-token')
  const numKeep = core.getInput('num-keep')
  const dryRun = core.getInput('dry-run')
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
