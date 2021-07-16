const assert = require('chai').assert
const expect = require('chai').expect
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

describe('Type validation', function() {
    it("The container type is correct", function(){
        let type = repoUtil.isValidType("contAINER")
        assert.equal(type, 'container')
    })

    it("The docker type is correct", function(){
        let type = repoUtil.isValidType("dOckER")
        assert.equal(type, 'docker')
    })

    it("Test fails with an invalid input", function(){
        expect(function() { repoUtil.isValidType("le_taco")}).to.throw(Error)
    })
})





