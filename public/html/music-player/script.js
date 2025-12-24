const $ = document.querySelector.bind(document);
const $$ = document.querySelectorAll.bind(document);
const PLAYER_STORAGE_KEY = "MUSIC_PLAYER_TienHieu";
const player = $(".player");
const cd = $(".cd");
const heading = $("header h2");
const cdThumb = $(".cd-thumb");
const audio = $("#audio");
const playBtn = $(".btn-toggle-play");
const progress = $("#progress");
const prevBtn = $(".btn-prev");
const nextBtn = $(".btn-next");
const randomBtn = $(".btn-random");
const repeatBtn = $(".btn-repeat");
const playlist = $(".playlist");
const app = {
  currentIndex: 0,
  isPlaying: true,
  isRandom: false,
  isRepeat: false,
  isNext: false,
  isPrev: false,
  config: JSON.parse(localStorage.getItem(PLAYER_STORAGE_KEY)) || {},
  songs: [{
    name: "Những gì anh nói",
    singer: "Bozitt",
    path: "https://mp3.filmisongs.com/go.php?id=Damn%20Song%20Raftaar%20Ft%20KrSNa.mp3",
    image: "https://i.scdn.co/image/ab67616d00001e022fb9120f78fcdc3d7475950b"
  }, {
    name: "Tu Phir Se Aana",
    singer: "Raftaar x Salim Merchant x Karma",
    path: "https://mp3.filmisongs.com/go.php?id=Damn%20Song%20Raftaar%20Ft%20KrSNa.mp3",
    image: "https://1.bp.blogspot.com/-kX21dGUuTdM/X85ij1SBeEI/AAAAAAAAKK4/feboCtDKkls19cZw3glZWRdJ6J8alCm-gCNcBGAsYHQ/s16000/Tu%2BAana%2BPhir%2BSe%2BRap%2BSong%2BLyrics%2BBy%2BRaftaar.jpg"
  }, {
    name: "Naachne Ka Shaunq",
    singer: "Raftaar x Brobha V",
    path: "https://mp3.filmisongs.com/go.php?id=Damn%20Song%20Raftaar%20Ft%20KrSNa.mp3",
    image: "https://i.ytimg.com/vi/QvswgfLDuPg/maxresdefault.jpg"
  }, {
    name: "Mantoiyat",
    singer: "Raftaar x Nawazuddin Siddiqui",
    path: "https://mp3.filmisongs.com/go.php?id=Damn%20Song%20Raftaar%20Ft%20KrSNa.mp3",
    image: "https://a10.gaanacdn.com/images/song/39/24225939/crop_480x480_1536749130.jpg"
  }, {
    name: "Aage Chal",
    singer: "Raftaar",
    path: "https://mp3.filmisongs.com/go.php?id=Damn%20Song%20Raftaar%20Ft%20KrSNa.mp3",
    image: "https://a10.gaanacdn.com/images/albums/72/3019572/crop_480x480_3019572.jpg"
  }, {
    name: "Damn",
    singer: "Raftaar x kr$na",
    path: "https://mp3.filmisongs.com/go.php?id=Damn%20Song%20Raftaar%20Ft%20KrSNa.mp3",
    image: "https://th.bing.com/th/id/R.b31b8f518e5ae15eaff9b123f2dd32d6?rik=778WnQ%2bAs5P0OA&riu=http%3a%2f%2fc1.staticflickr.com%2f4%2f3391%2f3233046074_34a63d9696_m.jpg&ehk=vdUHoooXhAwG2vehEL6FiO1xDBZeBBkbFubqjZq%2b0sk%3d&risl=&pid=ImgRaw&r=0&sres=1&sresct=1"
  }, {
    name: "Feeling You",
    singer: "Raftaar x Harjas",
    path: "https://mp3.filmisongs.com/go.php?id=Damn%20Song%20Raftaar%20Ft%20KrSNa.mp3",
    image: "https://a10.gaanacdn.com/gn_img/albums/YoEWlabzXB/oEWlj5gYKz/size_xxl_1586752323.webp"
  }, {
    name: "Những gì anh nói",
    singer: "Bozitt",
    path: "https://mp3.filmisongs.com/go.php?id=Damn%20Song%20Raftaar%20Ft%20KrSNa.mp3",
    image: "https://i.scdn.co/image/ab67616d00001e022fb9120f78fcdc3d7475950b"
  }, {
    name: "Tu Phir Se Aana",
    singer: "Raftaar x Salim Merchant x Karma",
    path: "https://mp3.filmisongs.com/go.php?id=Damn%20Song%20Raftaar%20Ft%20KrSNa.mp3",
    image: "https://1.bp.blogspot.com/-kX21dGUuTdM/X85ij1SBeEI/AAAAAAAAKK4/feboCtDKkls19cZw3glZWRdJ6J8alCm-gCNcBGAsYHQ/s16000/Tu%2BAana%2BPhir%2BSe%2BRap%2BSong%2BLyrics%2BBy%2BRaftaar.jpg"
  }, {
    name: "Naachne Ka Shaunq",
    singer: "Raftaar x Brobha V",
    path: "https://mp3.filmisongs.com/go.php?id=Damn%20Song%20Raftaar%20Ft%20KrSNa.mp3",
    image: "https://i.ytimg.com/vi/QvswgfLDuPg/maxresdefault.jpg"
  }, {
    name: "Mantoiyat",
    singer: "Raftaar x Nawazuddin Siddiqui",
    path: "https://mp3.filmisongs.com/go.php?id=Damn%20Song%20Raftaar%20Ft%20KrSNa.mp3",
    image: "https://a10.gaanacdn.com/images/song/39/24225939/crop_480x480_1536749130.jpg"
  }, {
    name: "Aage Chal",
    singer: "Raftaar",
    path: "https://mp3.filmisongs.com/go.php?id=Damn%20Song%20Raftaar%20Ft%20KrSNa.mp3",
    image: "https://a10.gaanacdn.com/images/albums/72/3019572/crop_480x480_3019572.jpg"
  }, {
    name: "Damn",
    singer: "Raftaar x kr$na",
    path: "https://mp3.filmisongs.com/go.php?id=Damn%20Song%20Raftaar%20Ft%20KrSNa.mp3",
    image: "https://th.bing.com/th/id/R.b31b8f518e5ae15eaff9b123f2dd32d6?rik=778WnQ%2bAs5P0OA&riu=http%3a%2f%2fc1.staticflickr.com%2f4%2f3391%2f3233046074_34a63d9696_m.jpg&ehk=vdUHoooXhAwG2vehEL6FiO1xDBZeBBkbFubqjZq%2b0sk%3d&risl=&pid=ImgRaw&r=0&sres=1&sresct=1"
  }, {
    name: "Feeling You",
    singer: "Raftaar x Harjas",
    path: "https://mp3.filmisongs.com/go.php?id=Damn%20Song%20Raftaar%20Ft%20KrSNa.mp3",
    image: "https://a10.gaanacdn.com/gn_img/albums/YoEWlabzXB/oEWlj5gYKz/size_xxl_1586752323.webp"
  }],
  setConfig: function(key, value) {
    this.config[key] = value;
    localStorage.setItem(PLAYER_STORAGE_KEY, JSON.stringify(this.config));
  },
  render: function() {
    const htmls = this.songs.map((song, index) => {
      return `
        <div class="song ${index === this.currentIndex ? "active" : ""}" data-index="${index}">
            <div class="thumb"
                style="background-image: url('${song.image}')">
            </div>
            <div class="body">
                <h3 class="title">${song.name}</h3>
                <p class="author">${song.singer}</p>
            </div>
            <div class="option">
                <i class="fas fa-ellipsis-h"></i>
            </div>
        </div>
    `;
    });
    playlist.innerHTML = htmls.join("");
  },
  defineProperties: function() {
    Object.defineProperty(this, "currentSong", {
      get: function() {
        return this.songs[this.currentIndex];
      }
    });
  },
  handleEvents: function() {
    const _this = this;
    const cdWidth = cd.offsetWidth;
    const cdThumbAnimate = cdThumb.animate([{
      transform: "rotate(360deg)"
    }], {
      duration: 1e4,
      itetations: Infinity
    });
    cdThumbAnimate.pause();
    document.onscroll = function() {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const newCdWidth = cdWidth - scrollTop;
      cd.style.width = newCdWidth > 0 ? newCdWidth + "px" : 0;
      cd.style.opacity = newCdWidth / cdWidth;
    }, playBtn.onclick = function() {
      if (_this.isPlaying) {
        audio.pause();
      } else {
        audio.play();
      }
    };
    audio.onplay = function() {
      _this.isPlaying = true;
      player.classList.add("playing");
      cdThumbAnimate.play();
    };
    audio.onpause = function() {
      _this.isPlaying = false;
      player.classList.remove("playing");
      cdThumbAnimate.pause();
    };
    audio.ontimeupdate = function() {
      if (audio.duration) {
        const progressPercent = Math.floor(audio.currentTime / audio.duration * 100);
        progress.value = progressPercent;
      }
    };
    progress.onchange = function(e) {
      const seekTime = audio.duration / 100 * e.target.value;
      audio.currentTime = seekTime;
    };
    nextBtn.onmousedown = function() {
      _this.isNext = !_this.isNext;
      nextBtn.classList.toggle("active", _this.isNext);
    };
    nextBtn.onmouseup = function() {
      _this.isNext = !_this.isNext;
      nextBtn.classList.remove("active", _this.isNext);
    };
    prevBtn.onmousedown = function() {
      _this.isPrev = !_this.isPrev;
      prevBtn.classList.toggle("active", _this.isPrev);
    };
    prevBtn.onmouseup = function() {
      _this.isPrev = !_this.isPrev;
      prevBtn.classList.remove("active", _this.isPrev);
    };
    nextBtn.onclick = function() {
      if (_this.isRandom) {
        _this.randomSong();
      } else {
        _this.nextSong();
      }
      audio.play();
      _this.render();
      _this.scrollToActiveSong();
    };
    prevBtn.onclick = function() {
      if (_this.isRandom) {
        _this.randomSong();
      } else {
        _this.prevSong();
      }
      audio.play();
      _this.render();
      _this.scrollToActiveSong();
    };
    randomBtn.onclick = function(e) {
      _this.isRandom = !_this.isRandom;
      _this.setConfig("isRandom", _this.isRandom);
      randomBtn.classList.toggle("active", _this.isRandom);
    };
    repeatBtn.onclick = function(e) {
      _this.isRepeat = !_this.isRepeat;
      _this.setConfig("isRepeat", _this.isRepeat);
      repeatBtn.classList.toggle("active", _this.isRepeat);
    };
    audio.onended = function() {
      if (_this.isRepeat) {
        audio.play();
      } else {
        nextBtn.click();
      }
    };
    playlist.onclick = function(e) {
      const songNode = e.target.closest(".song:not(.active)");
      if (songNode || e.target.closest(".options")) {
        if (songNode) {
          _this.currentIndex = Number(songNode.dataset.index);
          _this.loadCurrentSong();
          audio.play();
          _this.render();
        }
        if (e.target.closest(".options")) {}
      }
    };
  },
  scrollToActiveSong: function() {
    setTimeout(() => {
      $(".song.active").scrollIntoView({
        behavior: "smooth",
        block: "nearest"
      });
    }, 100);
  },
  loadCurrentSong: function() {
    heading.textContent = this.currentSong.name;
    cdThumb.style.backgroundImage = `url('${this.currentSong.image}')`;
    audio.src = this.currentSong.path;
  },
  loadConfig: function() {
    this.isRandom = this.config.isRandom;
    this.isRepeat = this.config.isRepeat;
  },
  nextSong: function() {
    this.currentIndex++;
    if (this.currentIndex >= this.songs.length) {
      this.currentIndex = 0;
    }
    this.loadCurrentSong();
  },
  prevSong: function() {
    this.currentIndex--;
    if (this.currentIndex < 0) {
      this.currentIndex = this.songs.length - 1;
    }
    this.loadCurrentSong();
  },
  randomSong: function() {
    let newIndex;
    do {
      newIndex = Math.floor(Math.random() * this.songs.length);
    } while (newIndex === this.currentIndex);
    this.currentIndex = newIndex;
    this.loadCurrentSong();
  },
  start: function() {
    this.loadConfig();
    this.defineProperties();
    this.handleEvents();
    this.loadCurrentSong();
    this.render();
    randomBtn.classList.toggle("active", this.isRandom);
    repeatBtn.classList.toggle("active", this.isRepeat);
  }
};
app.start();