const express = require("express");
const cors = require("cors");
const app = express();
const PORT = process.env.PORT || 80;
const fs = require('fs');

app.use(cors());

// Global cache for Reddit content data
let redditContentCache = [];
let redditPage = 1;
// Fetch and cache Reddit content once on startup
async function fetchRedditContent() {
  try {
    // const response = await fetch(`https://old.reddit.com/r/comedy/top.json?raw_json=1&t=all`);
    const response = fs.readFileSync('sample.json', 'utf8');
    const json = await JSON.parse(response);

    const newItems = json.data.children
      .filter(post => {
        const media = post.data.secure_media;
        // Check if there is video data available
        return media && (media.reddit_video || media.video);
      })
      .map(post => {
        const media = post.data.secure_media;
        const video = media.reddit_video || media.video;
        const image = post.data.preview &&
          post.data.preview.images &&
          post.data.preview.images[0] &&
          post.data.preview.images[0].source
          ? post.data.preview.images[0].source.url
          : "";
        const track = {
          streamingUrl: video.hls_url || video.hlsUrl || "",
          duration: 0,
          trackType: "S",
          isLive: false,
          offlineUrl: ""
        }
        return {
          contentId: getRandomInt(0,99999999),
          contentType: ["SV", "S", "C", "HT"][getRandomInt(0, 3)],
          details: `This is a random content description ${getRandomInt(1, 100)}`,
          track: track,
          image: image,
          imageWebUrl: image,
          title: post.data.title || "",
          isPaid: Math.random() < 0.5,
          likeCount: getRandomInt(0, 10000),
          totalShorts: getRandomInt(0, 100),
          createdAtEpoch: Date.now() - getRandomInt(0, 100000000),
          owner: {
            ownerId: 4,
            ownerType: "CHANNEL",
            ownerName: "Shadhin",
            usercode: "",
            ownerImageUrl: "https://cdn-icons-png.flaticon.com/512/1384/1384060.png",
            reelsCount: 0,
            followersCount: 0,
            ownerFavoritesCount: 0,
            followingsCount: 0,
            ownerViewsCount: 0,
            isVerified: false
          }
        
        };
      });

      redditContentCache.push(...newItems);

    console.log("Reddit content cache loaded. Total items:", redditContentCache.length);
  } catch (error) {
    console.error("Error fetching Reddit data", error);
  }
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Updated getRandomContent() using cached Reddit data
function getRandomContent() {
  if (redditContentCache.length === 0) {
    // Optionally, return a fallback object if needed.
    return {
      contentId: "-" + getRandomInt(0,9999999999).toString(),
      track: "",
      image: "",
      title: "No content available"
    };
  }
  const randomIndex = getRandomInt(0, redditContentCache.length - 1);
  return redditContentCache[randomIndex];
}



const totalItems = 30;
const totalPages = 15;
const pageSize = 2;
const patchList = [];

// Generate patches using getRandomContent() from the Reddit cache
function generateInitialPatches() {
  for (let page = 1; page <= totalPages; page++) {
    for (let i = 0; i < pageSize; i++) {
      insertPatch(page);
    }
  }
  // Sort patches by the "sort" field
  patchList.sort((a, b) => a.sort - b.sort);
}

const allowedDesignTypes = [0, 1, 2, 4];
let designTypeCounts = { 0: 0, 1: 0, 2: 0, 4: 0 };

function insertPatch(page) {
  const patch = getRandomPatch(page);
  const designType = patch.sort;
  if (allowedDesignTypes.includes(designType)) {
    if (designTypeCounts[designType] < 1) {
      if (patchList.find((item) => item.patch.id === patch.patch.id)) {
        insertPatch(page);
      } else {
        patchList.push(patch);
        designTypeCounts[designType] = 1;
      }
    } else {
      insertPatch(page);
    }
  } else {
    if (patchList.find((item) => item.patch.id === patch.patch.id)) {
      insertPatch(page);
    } else {
      patchList.push(patch);
    }
  }
}

function getRandomUniqueItems(designType, arr) {
  for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  const filteredArr = arr.filter(item => {
      if ([2, 3, 8].includes(designType)) {
          return item.contentType === "SV";
      } else if ([4, 6].includes(designType)) {
          return item.contentType === "C";
      } else if (designType === 5) {
          return item.contentType === "S";
      } else if (designType === 7) {
        return item.contentType === "HT";
      }
      return false;
  });

  const numItems = Math.floor(Math.random() * filteredArr.length) + 1;
  
  return filteredArr.slice(0, numItems);
}

function getRandomPatch(page) {
  const patch = getRandomPatchInfo();
  return {
    id: getRandomInt(1, 1000),
    pageNumber: page,
    sort: patch.designType,
    patch: patch,
    contents: getRandomUniqueItems(patch.designType, redditContentCache)
  };
}

function getRandomPatchInfo() {
  return {
    code: `CODE-${getRandomInt(1000, 9999)}`,
    description: `This is a random description ${getRandomInt(1, 100)}`,
    designType: getRandomInt(1, 9),
    isAds: Math.random() < 0.5,
    isAdsNumber: getRandomInt(0, 5),
    id: getRandomInt(1, 1000),
    imageUrl: `https://picsum.photos/200/300?random=${getRandomInt(1, 1000)}`,
    isSeeAllActive: Math.random() < 0.5,
    isShuffle: Math.random() < 0.5,
    sort: getRandomInt(0, 10),
    title: `Random Patch ${getRandomInt(1, 100)}`
  };
}

app.get("/home-patch", (req, res) => {
  const page = parseInt(req.query.page) || 1;
  if (page < 1 || page > totalPages) {
    return res.status(400).json({ status: "error", message: "Invalid page range" });
  }

  // Calculate the start and end index for the page patches
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const pagePatches = patchList.slice(startIndex, endIndex);

  res.json({
    status: "success",
    data: pagePatches,
    pagination: {
      currentPage: page,
      totalPages,
      totalItems
    }
  });
});

let page = 1;
app.get("/more", async(req, res) => {
  console.log("bro is asking for more shorts for " + page  + "times");
  res.json(await getNewShorts());
});

async function getNewShorts() {
  try {
    const response = await fetch(`https://old.reddit.com/r/comedy/top.json?raw_json=1&t=all`);
    const json = await response.json();

    page += 1; 

    return json.data.children
      .filter(post => {
        const media = post.data.secure_media;
        // Check if there is video data available
        return media && (media.reddit_video || media.video);
      })
      .map(post => {
        const media = post.data.secure_media;
        const video = media.reddit_video || media.video;
        const image = post.data.preview &&
          post.data.preview.images &&
          post.data.preview.images[0] &&
          post.data.preview.images[0].source
          ? post.data.preview.images[0].source.url
          : "";

          const track = {
            streamingUrl: video.hls_url || video.hlsUrl || "",
            duration: 0,
            trackType: "S",
            isLive: false,
            offlineUrl: ""
          }
          return {
            contentId: getRandomInt(0,99999999),
            contentType: ["SV", "S", "SV"][getRandomInt(0, 2)],
            details: `This is a random content description ${getRandomInt(1, 100)}`,
            track: track,
            image: image,
            imageWebUrl: image,
            title: post.data.title || "",
            isPaid: Math.random() < 0.5,
            likeCount: getRandomInt(0, 10000),
            totalShorts: getRandomInt(0, 100),
            createdAtEpoch: Date.now() - getRandomInt(0, 100000000),
            owner: {
              ownerId: 4,
              ownerType: "CHANNEL",
              ownerName: "Shadhin",
              usercode: "",
              ownerImageUrl: "",
              reelsCount: 0,
              followersCount: 0,
              ownerFavoritesCount: 0,
              followingsCount: 0,
              ownerViewsCount: 0,
              isVerified: false
            }
          };
      });

    console.log("Reddit content cache loaded. Total items:", redditContentCache.length);
  } catch (error) {
    console.error("Error fetching Reddit data", error);
  }
}


app.get("/", (req, res) => {
  res.json({
    status: "success",
    data: patchList,
    pagination: {
      currentPage: 1,
      totalPages,
      totalItems
    }
  });
});

// Initialize: fetch Reddit content, generate patches, then start the server
(async () => {
  for(i = 0; i < 2; i++){
    await fetchRedditContent();
    // redditPage++;
  }
  
  generateInitialPatches();
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
})();
