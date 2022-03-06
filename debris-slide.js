const DebrisFactory = function(type, mutables = [], callbacks = {}) {
  return new Proxy(type, {
    construct: (target, args) => {
      let instance = callbacks.loader ? callbacks.loader() : new target(...args);
      mutables.forEach(method => {
        let origMethod = instance[method]; // make sure it's a function?
        instance[method] = function () {
          let result = origMethod.bind(instance)(...arguments);
          if (callbacks.onMutate) callbacks.onMutate(instance, method);
          return result;
        };
      });

      return new Proxy(instance, {
        get: (obj, prop) => {
          if (typeof obj[prop] === "function") return obj[prop].bind(obj);
          else return obj[prop];
        },
        set: (obj, prop, val, _receiver) => {
          obj[prop] = val;
          return true;
        }
      })
    }
  });
};

// Array#length = 0 mutates but this won't catch it
const DebrisList = DebrisFactory(Array, ["fill", "pop", "push", "reverse", "shift", "slice", "sort", "splice", "unshift"], {
  onMutate: (list, prop) => { sessionStorage.setItem('dl', JSON.stringify(list)) }
});

const DebrisSet = DebrisFactory(Set, ["add", "clear", "delete"], {
  loader: (set) => { console.log("loading!"); return new Set(JSON.parse(sessionStorage.getItem('ds') || '[]')) },
  onMutate: (set, prop) => { console.log("mutating!"); sessionStorage.setItem('ds', JSON.stringify(Array.from(set))) }
});

const DebrisMap = DebrisFactory(Map, ["clear", "delete", "set"], {
  loader: (map) => { console.log("loading!"); return new Map(JSON.parse(sessionStorage.getItem('dm') || '[]')) },
  onMutate: (map, prop) => { console.log("mutating!"); sessionStorage.setItem('dm', JSON.stringify(Array.from(map))) }
});

class SetSerializer {
  static parse(string) { return new Set(JSON.parse(string)) }
  static stringify(set) { return JSON.stringify(Array.from(set)) }
}

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

class DebrisQueue {
  constructor(key = "debris-q", store = window.localStorage) {
    this.key = key;
    this.store = store;
  }

  toArray() { return JSON.parse(this.store.getItem(this.key) || '[]') }

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
