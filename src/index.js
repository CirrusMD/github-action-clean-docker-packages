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
                pageInfo{
                  hasNextPage,
                  endCursor
                }
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

  if (dockerPkg.repository.packages.edges[0].node.versions.edges === undefined) {
    throw 'Error: Repository has no containers!'
    console.log('Error: Repository has no containers!')
    process.exit(1)
  }

  var currentList   = dockerPkg.repository.packages.edges[0].node.versions.edges
  var paginatedList = dockerPkg.repository.packages.edges[0].node.versions.edges
  var hasNextPage   = dockerPkg.repository.packages.edges[0].node.versions.pageInfo.hasNextPage

  if (hasNextPage) {
    do {
      let endCursor     = dockerPkg.repository.packages.edges[0].node.versions.pageInfo.endCursor
      
      let nextDockerPkg = await listPackagesWithPagination(ghToken, repoName, repoOwner, packageName, packageCount, isDesc, endCursor)
      let formatted = nextDockerPkg.repository.packages.edges[0].node.versions.edges
      var paginatedList = fullList = [...new Set([...currentList, ...formatted])]
      
      var hasNextPage = nextDockerPkg.repository.packages.edges[0].node.versions.pageInfo.hasNextPage === false || nextDockerPkg.repository.packages.edges[0].node.versions.pageInfo.hasNextPage === undefined ? false : true
    } while (hasNextPage === true)
  }

  return paginatedList
}

/**
 * listPackagesWithPagination, for use when there are >100 packages
 *
 * @param {string} ghToken 
 * @param {string} repoName 
 * @param {string} repoOwner 
 * @param {string} packageName 
 * @param {int} packageCount 
 * @param {bool} isDesc 
 * @param {string} endCursor
 * @returns array of docker container versions
 */

async function listPackagesWithPagination (ghToken, repoName, repoOwner, packageName, packageCount, isDesc, endCursor) {
    const listDirection = getDirection(isDesc)

    const dockerPkgWithPagination = await graphql.graphql({
      query: `query dockerPkg($repoOwner: String!, $repoName: String!, $packageName: String!, $packageCount: Int, $listDirection: String!, $endCursor: String!){
        repository(name:$repoName, owner:$repoOwner)
      {
        packages(packageType:DOCKER, last:$packageCount, names:[$packageName]) {
          edges{
            node{
              id,
              name,
              versions(first:$packageCount, after:$endCursor, orderBy: {field: CREATED_AT, direction: $listDirection}){
                pageInfo{ 
                  hasNextPage,
                  endCursor
                }
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
      endCursor: endCursor,
      headers: {
        authorization: `token ${ghToken}`
      }
    }
    )

  return dockerPkgWithPagination
}


/**
 * 
 * @param {string} repoName 
 * @param {string} repoOwner 
 * Checks to see if a provided repository exists to avoid further error messages
 */
async function checkRepo (ghToken, repoName, repoOwner) {
  try {
    const repoExists = await graphql.graphql({
      query: `query repository($repoName: String!, $repoOwner: String!){
        repository(name:$repoName, owner:$repoOwner)
        { name }
      }`,
      repoOwner: repoOwner,
      repoName: repoName,
      headers: {
        authorization: `token ${ghToken}`
      }
    }
    )

  return repoExists

  } catch (e) {
    throw 'Error: Repository was not found! Check the name of your repo.'
    core.setFailed(`github-action-clean-docker-packages failed for reason: ${e}`)
    process.exit(1)
  }
}

async function getPackages (ghToken, repoName, repoOwner, packageName, packageCount = 100) {
  const token = ghToken
  let pkgDescList = await listPackages(token, repoName, repoOwner, packageName, packageCount, true)
  let pkgAscList = await listPackages(token, repoName, repoOwner, packageName, packageCount, false)
  // get just a list of versions and the begin and end of the list
  pkgDescList = pkgDescList.map(buildVersions)

  pkgAscList = pkgAscList.map(buildVersions)

  // Smashing the two objects together
  const fullList = [...new Set([...pkgDescList, ...pkgAscList])]
  console.log(fullList)
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

  checkRepo(ghToken, repoName, repoOwner)

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
