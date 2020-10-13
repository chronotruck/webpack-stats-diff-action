const path = require("path");
const fs = require("fs");
const github = require("@actions/github");
const core = require("@actions/core");
const { getStatsDiff } = require("webpack-stats-diff");
const fileSize = require("filesize");
const markdownTable = require("markdown-table");

const doesPathExists = (path) => {
  if (!fs.existsSync(path)) {
    throw new Error(`${path} does not exist!`);
  }
};

const SKIP_EXTENSIONS = Symbol("SKIP_EXTENSIONS");
const ALL_EXTENSIONS = Symbol("ALL_EXTENSIONS");

const parseExtensionExpression = (extensionExpression) =>
  typeof extensionExpression === "string"
    ? extensionExpression.length > 0
      ? extensionExpression.split(",").map((extension) => extension.trim())
      : SKIP_EXTENSIONS
    : extensionExpression;

async function run() {
  try {
    const statsPaths = {
      base: core.getInput("base_stats_path"),
      head: core.getInput("head_stats_path"),
    };

    const assetGroups = [
      { name: "all", extensions: ALL_EXTENSIONS },
      {
        name: "documents",
        extensions: parseExtensionExpression(
          core.getInput("document_extensions")
        ),
      },
      {
        name: "scripts",
        extensions: parseExtensionExpression(
          core.getInput("script_extensions")
        ),
      },
      {
        name: "stylesheets",
        extensions: parseExtensionExpression(
          core.getInput("stylesheet_extensions")
        ),
      },
      {
        name: "images",
        extensions: parseExtensionExpression(core.getInput("image_extensions")),
      },
      {
        name: "others",
        extensions: parseExtensionExpression(core.getInput("other_extensions")),
      },
    ];

    const paths = {
      base: path.resolve(process.cwd(), statsPaths.base),
      head: path.resolve(process.cwd(), statsPaths.head),
    };

    doesPathExists(paths.base);
    doesPathExists(paths.head);

    const assets = {
      base: require(paths.base).assets,
      head: require(paths.head).assets,
    };

    const assetGroupStatsDiffs = assetGroups
      .filter(
        (assetGroup) => assetGroup.extensions.extensions !== SKIP_EXTENSIONS
      )
      .map((assetGroup) => ({
        group: assetGroup,
        statsDiff: getStatsDiff(assets.base, assets.head, {
          extensions:
            assetGroup.extensions === ALL_EXTENSIONS
              ? null
              : assetGroup.extensions,
        }),
      }));

    const summaryTable = markdownTable([
      ["Asset group", "Old size", "New size", "Diff"],
      assetGroupStatsDiffs.map((assetGroupStatsDiff) => [
        assetGroupStatsDiff.group.name,
        fileSize(diff.total.oldSize),
        fileSize(diff.total.newSize),
        `${fileSize(diff.total.diff)} (${diff.total.diffPercentage.toFixed(
          2
        )}%)`,
      ]),
    ]);

    /**
     * Publish a comment in the PR with the diff result.
     */
    const octokit = github.getOctokit(core.getInput("token"));

    const pullRequestId = github.context.issue.number;
    if (!pullRequestId) {
      throw new Error("Cannot find the PR id.");
    }

    await octokit.issues.createComment({
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      issue_number: pullRequestId,
      body: `## Bundle difference
${summaryTable}
`,
    });
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
