const core = require('@actions/core')
const Octokit = require('@octokit/rest')


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

