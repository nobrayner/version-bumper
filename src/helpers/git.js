const core = require('@actions/core')
const exec = require('@actions/exec')

const { GITHUB_REPOSITORY, GITHUB_REF } = process.env
const branch = GITHUB_REF.replace('refs/heads/', '')

module.exports = new (class Git {
  constructor() {
    const githubToken = core.getInput('github-token', { required: true })
    core.setSecret(githubToken)

    this.setOrigin(`https://x-access-token:${githubToken}@github.com/${GITHUB_REPOSITORY}.git`)

    this.checkout()

    this.isShallow = (this.revParse(['--is-shallow-repository']) === 'true')
  }

  isShallow = false

  exec = (command) => new Promise(async(resolve, reject) => {
    let output = ''

    const options = {
      listeners: {
        stdout: (data) => {
          output += data.toString()
        }
      }
    }

    try {
      await exec.exec(`git ${command}`, null, options)

      resolve(output)
    } catch (e) {
      reject(e)
    }
  })

  revParse = (args) => this.exec(`rev-parse ${args.join(' ')}`)

  pull = () => {
    let unshallow = (isShallow ? '' : ' --unshallow')
    this.exec(`pull${unshallow}`)
  }

  fetchTags = () => {
    let unshallow = (isShallow ? '' : ' --unshallow')
    this.exec(`fetch --all --tags${unshallow}`)
  }

  describeTags = (commitish) => this.exec(`describe --tags --abbrev=0 ${commitish}`)

  checkout = () => this.exec(`checkout ${branch}`)

  setOrigin = (repo) => this.exec(`remote set-url origin ${repo}`)
})()