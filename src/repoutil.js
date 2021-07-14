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

module.exports.createOcto = async function createOcto(cfg){
    return new Octokit({
        auth: cfg.ghToken
    })
}

