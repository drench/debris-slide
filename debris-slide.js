class DebrisPlayer {
  constructor(element) {
    this.element = element;
    this.playHistory = []; // Just URLs for now. Future: timestamps, skips, etc.
    this.playQueue = []; // Just URLs for now. Future: timestamps, skips, etc.

    let self = this;
    this.element.addEventListener('ended', (event) => {
      self.playNext();
    });
  }

  playNext() {
    let nextTrack = this.playQueue.shift();
    if (nextTrack) {
      this.playHistory.unshift(nextTrack);
      this.element.src = nextTrack;
      console.debug(`Now playing ${nextTrack}`);
    }
    else console.debug('the queue is empty!');
  }
}

// Consider this for localStorage seralize/deserialize:
// https://stackoverflow.com/a/4762411/73779

window.addEventListener('load', (event) => {
  window.player = new DebrisPlayer(document.getElementById("player"));
});
