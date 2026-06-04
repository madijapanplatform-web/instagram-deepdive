# Apify scraping — `apify/instagram-scraper`

How to scrape posts/reels and profile details, and the gotchas that bite.

## Tools (Apify MCP)
- `search-actors` — only if you need to confirm the actor exists.
- `fetch-actor-details` (output `{inputSchema:true}`) — to recheck the input schema if unsure.
- `call-actor` — run it. Use `async:true` and poll; synchronous runs time out for big scrapes.
- `get-actor-run` — poll status by `runId` until `status:"SUCCEEDED"`.
- `get-actor-output` — pull dataset items by `datasetId`, selecting `fields` to keep it small.

## Scrape posts + reels (profile mode)

```json
{
  "actor": "apify/instagram-scraper",
  "input": {
    "directUrls": ["https://www.instagram.com/<username>/", "https://www.instagram.com/<other>/"],
    "resultsType": "posts",
    "resultsLimit": 100,
    "onlyPostsNewerThan": "30 days",
    "addParentData": true
  },
  "async": true
}
```

- `resultsType:"posts"` returns the feed including reels (each item has `type` = `Video`/`Sidecar`/`Image`,
  and reels have `productType:"clips"`, `videoUrl`, `videoViewCount`/`videoPlayCount`, `videoDuration`).
- `onlyPostsNewerThan` accepts `"30 days"`, `"2 months"`, or `YYYY-MM-DD` (UTC).
- `addParentData:true` adds **`inputUrl`** to every item — essential for grouping (see gotcha below).
- For a **single post/reel** target: `directUrls:["https://www.instagram.com/p/<code>/"]`,
  `resultsLimit:1`, no date filter.

Then poll and fetch:
1. `get-actor-run` → wait for `SUCCEEDED`, note `dataset.datasetId` (the result may exceed the token
   limit and get **saved to a file** — that's fine; read the file with Node, not into context).
2. `get-actor-output` with `datasetId` and a tight `fields` list, e.g.:
   `inputUrl,ownerUsername,ownerFullName,type,productType,shortCode,url,caption,hashtags,likesCount,commentsCount,videoViewCount,videoPlayCount,videoDuration,timestamp,displayUrl,videoUrl,images,dimensionsHeight,dimensionsWidth`
   This too is usually saved to a file. Process with Node.

## Scrape profile details (for headers)

```json
{ "actor":"apify/instagram-scraper",
  "input": { "directUrls":["https://www.instagram.com/<username>/"], "resultsType":"details", "resultsLimit":1 },
  "async": true }
```
Each item: `username, fullName, followersCount, followsCount, postsCount, biography,
profilePicUrlHD || profilePicUrl, verified`. Download the pic locally for the report header.

## Gotchas (important)

- **Group by `inputUrl`, not `ownerUsername`.** Collab posts and renamed accounts have an
  `ownerUsername` different from the profile you searched (e.g. a feed may contain a collaborator's
  handle). `inputUrl` always reflects the profile URL you requested. Grouping by owner misattributes
  or drops content.
- **Engagement metric.** Use `likesCount + commentsCount`. Treat `-1` or missing (hidden likes) as 0.
- **Reach signal.** Compare a reel's `videoViewCount` to the account's `followersCount` — views >
  followers indicates non-follower (Explore/recommendation) distribution, a key "why it spread" point.
- **Don't synchronous-call big scrapes** — they time out through MCP. Always `async:true` + poll.
- **Large outputs go to files.** Both `get-actor-run` (with preview) and `get-actor-output` will be
  saved to a tool-results file when over the token limit. Parse those files with Node and extract only
  the fields you need.
- **Cost.** Each run consumes Apify credits; scrape once, reuse the dataset. Don't re-scrape to fix a
  local processing mistake — re-process the saved file instead.
