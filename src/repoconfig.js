module.exports = class RepoConfig{
    constructor(ghRepo,ghToken,numKeep,dryRun,packageName,packageType) {
        this.ghRepo = ghRepo
        this.ghToken = ghToken
        this.numKeep = numKeep
        this.dryRun = dryRun
        this.packageName = packageName
        this.packageType = packageType
        this.repoOwner = this.ghRepo.split('/')[0]
        this.repoName = this.ghRepo.split('/')[1]
    }
}