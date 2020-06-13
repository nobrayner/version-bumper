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
  }

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

  fetchTags = () => this.exec(`fetch --all --tags`)

  describeTags = (commitish) => this.exec(`describe --tags --abbrev=0 ${commitish}`)

  checkout = () => this.exec(`checkout ${branch}`)

  setOrigin = (repo) => this.exec(`remote set-url origin ${repo}`)
})()