class DebrisTrack {
  constructor(args) {
    if (typeof(args) == "string") {
      this.url = url;
      this.hasTags = false;
      this.storeTags();
    }
    else if (typeof(args) == "object") {
      this.url = args.url;
      this.album = args.album;
      this.artist = args.artist;
      this.track = args.track;
      this.hasTags = true;
    }
    else {
      throw "argument must either be a string or an object";
    }
  }

  storeTags() {
    let self = this;
    this.fetchTags().then(result => {
      self.album = result.tags.album;
      self.artist = result.tags.artist;
      self.track = result.tags.track;
      self.hasTags = true;
    });
  }

  async fetchTags() {
    let url = this.url;
    return new Promise((resolve, reject) => {
      jsmediatags.read(url, { onSuccess: resolve, onError: reject });
    });
  }

  toString() {
    return this.url;
  }
}

class DebrisQueue {
  constructor(key, store, itemClass) {
    this.key = key;
    this.store = store;
    this.itemClass = itemClass;
    this.queue = this.fetchFromStore(); // make queue private
  }

  fetchFromStore() { // make private?
    let item = this.store.getItem(this.key);
    return JSON.parse(item || "[]").map(i => { new itemClass(i) });
  }

  persist() { // make private?
    this.store.setItem(this.key, JSON.stringify(this.queue));
  }

  pop() {
    let item = this.queue.pop();
    this.persist();
    return item;
  }

  push(item) { this.queue.push(item); this.persist(); }
  unshift(item) { this.queue.unshift(item); this.persist(); }
}

class DebrisPlayer {
  constructor(element) {
    this.element = element;
    this.playList = [];
    this.playPosition = -1;
    this.stopPlaying = false;
    this.initEventHandlers();
  }

  initEventHandlers() {
    let self = this;
    this.element.addEventListener('ended', (event) => {
      if (self.stopPlaying) {
        self.stopPlaying = false;
        console.debug('Stopping the playlist');
      }
      else self.playNext();
    });

    this.element.addEventListener('onchange', (event) => {
      console.log("change!", event.target.src)
    });

    let srcObserver = new MutationObserver((mutations, observer) => {
      mutations.forEach(mutation => {
        document.getElementById('track_url').innerText = mutation.target.src;
      });
    });
    srcObserver.observe(this.element, { attributes: true });

    this.element.addEventListener('timeupdate', (event) => {
      document.getElementById('current_time').innerText = event.target.currentTime;
    });

    this.element.addEventListener('volumechange', (event) => {
      document.getElementById('volume').innerText = event.target.volume;
    });
  }

  get currentTrack() {
    if (this.playPosition >= 0) return this.playList[this.playPosition];
  }

  playNext(delta) {
    delta ||= 1
    let playListLength = this.playList.length;

    if (playListLength == 0) return console.debug('the playList is empty!');
    if (!this.playList[this.playPosition + delta])
      return console.debug('end of the playList!');

    this.playPosition += delta;
    let nextTrack = this.playList[this.playPosition];
    this.element.src = nextTrack.url;
    console.debug(`Now playing ${nextTrack}`);
  }
}

// Consider this for localStorage seralize/deserialize:
// https://stackoverflow.com/a/4762411/73779

window.addEventListener('load', (event) => {
  window.player = new DebrisPlayer(document.getElementById("player"));
});
