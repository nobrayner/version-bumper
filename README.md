# version-bumper

A GitHub action to manage SemVer versioning in a platform agnostic way using npm-semver.

If versions match, the build number is updated if it is supplied.

This only supplies the next version - it is up to the user to use, and commit any changes based on the new version number.

## Inputs

- **Optional** `version-file`: The file (and path) the current version number is stored in. Defaults to 'version.info'
- **Optional** `branch`: The branch to retrieve the last version tag from. Defaults to the current branch
- **Optional** `default-version`: The version number to use when the the current or released version cannot be found. Defaults to 0.0.0
- **Optional** `bump`: What to bump: major, minor, patch, premajor, preminor, prepatch, or prerelease. Defaults to patch
- **Optional** `prerelease-text`: The pre-release text to add to a pre* bump - e.g. "alpha". Only applies to: premajor, preminor, prepatch, or prerelease
- **Optional** `build-number`: The build number to add to the version

## Outputs

- `version`: The version post-bump
- `new-version`: Whether or not a new version was output

## Example usage

Use the defaults

```yaml
- name: Checkout
  uses: actions/checkout@v2

- name: Version Bumper
  uses: nobrayner/version-bumper@v1
```

Overwrite everything

```yaml
- name: Checkout
  uses: actions/checkout@v2

- name: Version Bumper
  uses: nobrayner/version-bumper@v1
  with:
    version-file: './path/to/version.info'
    branch: 'master'
    default-version: '0.0.0'
    bump: 'preminor'
    prerelease-text: 'dev'
    build-number: ${{ github.run_number }}
```

Update version.info, npm front-end, and backend file and commit

```yaml
- name: Checkout
  uses: actions/checkout@v2

- name: Version Bumper
  id: version-bump
  uses: nobrayner/version-bumper@v1

- name: Update Version and Commit
  if: ${{ steps.version-bump.outputs.new-version }}
  run: |
    echo ${{ steps.version-bump.outputs.version }} > version.info
    cd web-app && npm version --git-tag-version=false ${{ steps.version-bump.outputs.version }}
    cd ../api && echo ${{ steps.version-bump.outputs.version }} > VERSION
    git config user.email version-bumper@github.com
    git config user.name ${{ github.actor }}
    git add .
    git commit -m "Bump version to ${{ steps.version-bump.outputs.version }}"
    git push
```