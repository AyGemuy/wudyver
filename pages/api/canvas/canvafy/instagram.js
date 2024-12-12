import canvafy from 'canvafy';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { username = 'wudy', avatarUrl = 'https://png.pngtree.com/thumb_back/fw800/background/20230117/pngtree-girl-with-red-eyes-in-anime-style-backdrop-poster-head-photo-image_49274352.jpg', postImage = 'https://png.pngtree.com/thumb_back/fw800/background/20230117/pngtree-girl-with-red-eyes-in-anime-style-backdrop-poster-head-photo-image_49274352.jpg', likeCount = 1200, likeText = 'like', verified = true, story = true, postDate, liked = true, saved = true, theme = 'light' } = req.query;

    if (!username || !avatarUrl || !postImage || !postDate) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    try {
      const instagramImage = await new canvafy.Instagram()
        .setTheme(theme)
        .setUser({ username })
        .setLike({ count: likeCount, likeText })
        .setVerified(verified)
        .setStory(story)
        .setPostDate(postDate)
        .setAvatar(avatarUrl)
        .setPostImage(postImage)
        .setLiked(liked)
        .setSaved(saved)
        .build();

      res.setHeader('Content-Type', 'image/png');
      res.status(200).send(instagramImage);
    } catch (error) {
      res.status(500).json({ error: 'Failed to generate Instagram image' });
    }
  } else {
    res.status(405).json({ error: 'Method Not Allowed' });
  }
}
