const StoredObjectFactory = (args) => {
  return new Proxy(args.type, {
    construct: (target, [options]) => {
      let instance = new args.type(args.parse(options.storage.getItem(options.key)));
      args.mutables.map(m => args.type.prototype[m]).forEach(method => {
        instance[method.name] = function () {
          let result = method.bind(instance)(...arguments);
          options.storage.setItem(options.key, args.stringify(instance)); // make this async?
          return result;
        };
      });

      return new Proxy(instance, {
        get: (obj, prop) => {
          if (typeof obj[prop] === "function") return obj[prop].bind(obj);
          else return obj[prop];
        }
      });
    }
  });
};

class StoredLog {
  constructor(options) { this.map = new StoredMap(options) }
  add(item, timestamp = new Date()) { this.map.set(timestamp, item) }
  entries() { return this.map.entries() }
}

const StoredMap = StoredObjectFactory({
  mutables: ['clear', 'delete', 'set'],
  parse: function (string) { return JSON.parse(string || '[]') },
  stringify: function (map) { return JSON.stringify(Array.from(map)) },
  type: Map
});

class StoredQueue {
  constructor(options) { this.map = new StoredMap(options) }

  enqueue(item, index = (new Date().getTime())) {
    while (this.map.has(index)) index += 1; // silly hack
    return this.map.set(index, item);
  }

  dequeue() {
    let iter = this.map.entries().next();
    if (iter.done) return;
    let [index, value] = iter.value;
    this.map.delete(index);
    return value;
  }

  peek() {
    let iter = this.map.entries().next();
    if (iter.done) return;
    return iter.value[1];
  }
}

const StoredSet = StoredObjectFactory({
  mutables: ['add', 'clear', 'delete'],
  parse: function (string) { return JSON.parse(string || '[]') },
  stringify: function (set) { return JSON.stringify(Array.from(set)) },
  type: Set
});

class DebrisLibrary {
  constructor(key = "debris-lib", store = window.localStorage) {
    this.key = key
    this.store = store;
  }

  toArray() { return JSON.parse(this.store.getItem(this.key) || '[]') }
  toSet() { return new Set(this.toArray()) }

  add(item) {
    let set = this.toSet();
    set.add(item);
    this.store.setItem(this.key, JSON.stringify(Array.from(set)));
  }

  delete(item) {
    let set = this.toSet();
    set.delete(item);
    this.store.setItem(this.key, JSON.stringify(Array.from(set)));
  }
}

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

// The play queue is where the "next" always comes from. This is a StoredQueue.
// When something is played, it's pushed to the log right at the start. This is a StoredLog.
// The play list is just an Array. Logic goes like this:
// Hit play. Pull the next track from the StoredQueue. Push it to the StoredLog and playList.
// If the user hits backwards, go backward in the playList, play it and push it to the StoredLog
// If the user hits forward:
//  If there's something "next" in the playList, play it and push it to the StoredLog
//  If there's nothing "next":
//    Grab the "next" from the StoredQueue
//      If there's nothing "next" do nothing
//      Else push it to the StoreLog and playList and play it

class DebrisPlayer {
  constructor(element, playQueue, playLog) {
    this.element = element;
    this.playQueue = playQueue;
    this.playLog = playLog;
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

    if (!this.playList[this.playPosition + delta]) { // TODO: this really only works for delta == 1
      let nextEntry = this.playQueue.dequeue();
      if (nextEntry) this.playList.push(nextEntry)
      else return console.debug('the playQueue is empty!');
    }

    let playListLength = this.playList.length;

    this.playPosition += delta;
    let nextTrack = this.playList[this.playPosition];
    this.element.src = nextTrack;
    this.playLog.add(nextTrack);
    console.debug(`Now playing ${nextTrack}`);
  }
}

window.addEventListener('load', (event) => {
  let log = new StoredLog({ key: "debrisLog", storage: window.localStorage });
  let queue = new StoredQueue({ key: "debrisQueue", storage: window.localStorage });
  window.player = new DebrisPlayer(document.getElementById("player"), queue, log);
});
