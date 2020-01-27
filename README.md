# Webpack stats diff Github Action

Creates a comment in your PR comparing two stats files.

## Inputs

### `base_stats_path`

**Required** Path to the Webpack generated "stats.json" file from the base branch.

### `head_stats_path`

**Required** Path to the Webpack generated "stats.json" file from the head branch.

### `token`

**Required** Github token so the package can publish a comment in the pull-request when the diff is ready.

## Usage

```yml
uses: chronotruck/webpack-stats-diff-action@v1
with:
  base_stats_path: '/path/to/my/stats.json'
  head_stats_path: '/path/to/my/stats.json'
  token: ${{ secrets.GITHUB_TOKEN }}
```
