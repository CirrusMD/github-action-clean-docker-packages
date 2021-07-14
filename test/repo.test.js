const assert = require('chai').assert
const repoConfig = require("../src/repoconfig")
const repoUtil = require("../src/repoutil")

describe('config works as expected', function() {
    it("should have the correct values", function(){
        let cfg = new repoConfig('cirrusmd/cirrusmd-web-app','fake_token',10,true,'webapp-legacyassets','DOCKER')
        assert.equal(cfg.repoName, 'cirrusmd-web-app')
        assert.equal(cfg.repoOwner, 'cirrusmd')
        assert.equal(cfg.ghToken, 'fake_token')
    })
})





