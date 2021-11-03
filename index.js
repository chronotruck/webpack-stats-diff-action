const path = require('path')
const fs = require('fs')
const github = require('@actions/github')
const core = require('@actions/core')
const { getStatsDiff } = require('webpack-stats-diff')
const fileSize = require('filesize')
const markdownTable = require('markdown-table')

const doesPathExist = path => {
  if (!fs.existsSync(path)) {
    throw new Error(`${path} does not exist!`);
  }
}

function createDiffRows(diffSection) {
  return diffSection.map((row) => (createDiffRow(row)));
}

function createDiffRow(data) {
  return [
    data.name,
    fileSize(data.oldSize),
    fileSize(data.newSize), 
    `${fileSize(data.diff)} (${data.diffPercentage.toFixed(2)}%)`
  ];
}

// get assets from path to stats.json, using first child if there are multiple bundles
function getAssets(path) {
  const json = require(path);
  if (json.children) {
    return json.children[0].assets;
  }
  return json.assets;
}

async function run() {
  try {
    let extensions = core.getInput('extensions');
    if (extensions) {
      extensions = extensions.split(',');
    }

    const threshold = Number(core.getInput('threshold'));
    const commentTitle = core.getInput('comment_title') || 'Bundle difference'
    const all = core.getInput('all') === 'true';

    
    const statsPaths = {
      base: core.getInput('base_stats_path'),
      head: core.getInput('head_stats_path')
    }

    const paths = {
      base: path.resolve(process.cwd(), statsPaths.base),
      head: path.resolve(process.cwd(), statsPaths.head)
    }

    doesPathExist(paths.base);
    doesPathExist(paths.head);

    const assets = {
      base: getAssets(paths.base),
      head: getAssets(paths.head)
    }

    const diff = getStatsDiff(assets.base, assets.head, {extensions, threshold});

    console.log(diff);

    const markdown = markdownTable([
      [
        'Name',
        'Old size',
        'New size',
        'Diff'
      ],
      createDiffRow(diff.total),
      ...createDiffRows(diff.added),
      ...createDiffRows(diff.bigger),
      ...createDiffRows(diff.smaller),
      ...createDiffRows(diff.removed),
      ...(all ? createDiffRows(diff.sameSize) : [])
    ]);

    const commentBody = `
## ${commentTitle}
${markdown}
    `
    console.log(commentBody);


    /**
     * Publish a comment in the PR with the diff result.
     */
     const octokit = github.getOctokit(core.getInput('token'))

     const pullRequestId = github.context.issue.number
     if (!pullRequestId) {
       throw new Error('Cannot find the PR id.')
     }


    await octokit.issues.createComment({
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      issue_number: pullRequestId,
      body: commentBody
    })
  }
  catch (error) {
    core.setFailed(error.message)
  }
}

run()
