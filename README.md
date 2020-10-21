# github-action-clean-docker-packages

This action will clean up the oldest Docker packages hosted on GitHub.  This is intended to be run in the GitHub repo 
where the package exists. 

## Inputs

### `gh-token`

**Required** a token which has the ability to remove packages in the repo.

### `docker-package`

**Required** the name of the docker-package you'd like to remove versions of.

### `num-keep`

**Optional** the number of most recent images to keep. Default: 100 

### `dry-run`

**Optional** removing packages can be scary so this will show you what we would remove (true/false). 

## Outputs

### `packages-cleaned`

a list of packages that were cleaned/removed from the repository

## Example usage

```
uses: cirrusmd/github-action-clean-docker-packages@v1.0.2
with:
  gh-token: ${{ secrets.YOUR_GH_TOKEN_SECRET }}
  docker-package: 'dockerImage'
  dry-run: true # enable dry-run just to test it 
```
  
